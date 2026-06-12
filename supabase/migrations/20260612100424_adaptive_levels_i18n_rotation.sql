alter table public.learning_units
  add column if not exists unlock_mastery integer not null default 70
    check (unlock_mastery between 50 and 100);

create index if not exists learning_units_path_position_idx
  on public.learning_units(path_id, position);
create index if not exists practice_questions_unit_public_idx
  on public.practice_questions(unit_id, is_public, difficulty);
create index if not exists challenge_participants_user_completed_idx
  on public.challenge_participants(user_id, completed_at, challenge_id);

create or replace function private.update_learning_progress_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempted_unit uuid;
  attempted_path uuid;
  question_total integer;
  passed_total integer;
  required_passes integer;
  required_mastery integer;
  unit_mastery numeric(5,2);
  unit_completed boolean;
  completed_units integer;
  total_units integer;
  next_unit uuid;
  skill_mastery numeric(5,2);
begin
  insert into public.user_skill_progress (
    user_id, skill, level, mastery, total_minutes, total_attempts,
    last_practiced_at, updated_at
  ) values (
    new.user_id, new.skill, 'A1', coalesce(new.score, 0),
    greatest(0, coalesce(new.duration_seconds, 0) / 60), 1, now(), now()
  )
  on conflict (user_id, skill) do update set
    mastery = round((
      public.user_skill_progress.mastery
      * least(public.user_skill_progress.total_attempts, 14)
      + coalesce(new.score, public.user_skill_progress.mastery)
    ) / (least(public.user_skill_progress.total_attempts, 14) + 1), 2),
    total_minutes = public.user_skill_progress.total_minutes
      + greatest(0, coalesce(new.duration_seconds, 0) / 60),
    total_attempts = public.user_skill_progress.total_attempts + 1,
    last_practiced_at = now(),
    updated_at = now()
  returning mastery into skill_mastery;

  update public.user_skill_progress
  set level = case
    when skill_mastery >= 88 then 'C1'
    when skill_mastery >= 76 then 'B2'
    when skill_mastery >= 62 then 'B1'
    when skill_mastery >= 45 then 'A2'
    else 'A1'
  end
  where user_id = new.user_id and skill = new.skill;

  select question.unit_id, unit.path_id, unit.unlock_mastery
    into attempted_unit, attempted_path, required_mastery
  from public.practice_questions question
  left join public.learning_units unit on unit.id = question.unit_id
  where question.id = new.question_id;

  if attempted_unit is null then return new; end if;

  select count(*) into question_total
  from public.practice_questions
  where unit_id = attempted_unit and is_public;

  select count(*) into passed_total
  from (
    select question.id
    from public.practice_questions question
    join public.practice_attempts attempt
      on attempt.question_id = question.id
      and attempt.user_id = new.user_id
    where question.unit_id = attempted_unit
      and question.is_public
    group by question.id
    having max(attempt.score) >= 70
  ) passed;

  select round(avg(best_score), 2) into unit_mastery
  from (
    select question.id, coalesce(max(attempt.score), 0) as best_score
    from public.practice_questions question
    left join public.practice_attempts attempt
      on attempt.question_id = question.id
      and attempt.user_id = new.user_id
    where question.unit_id = attempted_unit and question.is_public
    group by question.id
  ) scores;

  required_passes := greatest(1, ceil(question_total * 0.6)::integer);
  unit_completed := question_total > 0
    and passed_total >= required_passes
    and coalesce(unit_mastery, 0) >= coalesce(required_mastery, 70);

  insert into public.user_unit_progress(
    user_id, unit_id, mastery, best_score, attempts, passed_questions,
    total_questions, completed_at, updated_at
  ) values (
    new.user_id, attempted_unit, coalesce(unit_mastery, 0), coalesce(new.score, 0),
    1, passed_total, question_total,
    case when unit_completed then now() end, now()
  )
  on conflict (user_id, unit_id) do update set
    mastery = excluded.mastery,
    best_score = greatest(public.user_unit_progress.best_score, excluded.best_score),
    attempts = public.user_unit_progress.attempts + 1,
    passed_questions = excluded.passed_questions,
    total_questions = excluded.total_questions,
    completed_at = case
      when unit_completed then coalesce(public.user_unit_progress.completed_at, now())
      else null
    end,
    updated_at = now();

  if attempted_path is not null then
    select count(*) into total_units
    from public.learning_units where path_id = attempted_path;

    select count(*) into completed_units
    from public.learning_units unit
    join public.user_unit_progress progress
      on progress.unit_id = unit.id and progress.user_id = new.user_id
    where unit.path_id = attempted_path and progress.completed_at is not null;

    select unit.id into next_unit
    from public.learning_units unit
    left join public.user_unit_progress progress
      on progress.unit_id = unit.id and progress.user_id = new.user_id
    where unit.path_id = attempted_path and progress.completed_at is null
    order by unit.position
    limit 1;

    update public.user_path_enrollments
    set progress_percent = case when total_units > 0
          then round(completed_units * 100.0 / total_units, 2) else 0 end,
        current_unit_id = next_unit,
        status = case when completed_units >= total_units then 'completed' else 'active' end,
        completed_at = case when completed_units >= total_units then now() else null end
    where user_id = new.user_id and path_id = attempted_path;
  end if;
  return new;
end;
$$;

create or replace function private.refresh_recurring_challenges()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge record;
  next_code text;
  next_start timestamptz;
  next_end timestamptz;
begin
  for challenge in
    select id, challenge_type, season_code
    from public.learning_challenges
    where slug like 'mission-%'
  loop
    if challenge.challenge_type = 'daily' then
      next_code := to_char(current_date, 'YYYY-MM-DD');
      next_start := date_trunc('day', now());
      next_end := next_start + interval '1 day';
    else
      next_code := to_char(current_date, 'IYYY-"W"IW');
      next_start := date_trunc('week', now());
      next_end := next_start + interval '7 days';
    end if;

    if challenge.season_code is distinct from next_code then
      delete from public.challenge_participants
      where challenge_id = challenge.id;

      update public.learning_challenges
      set season_code = next_code,
          starts_at = next_start,
          ends_at = next_end
      where id = challenge.id;
    end if;
  end loop;
end;
$$;

create or replace function public.refresh_recurring_challenges()
returns void
language sql
security definer
set search_path = ''
as $$
  select private.refresh_recurring_challenges();
$$;

revoke all on function public.refresh_recurring_challenges()
  from public, anon, authenticated;
grant execute on function public.refresh_recurring_challenges()
  to service_role;

with path as (
  select id from public.learning_paths
  where slug = 'english-foundations-a1-b1'
)
insert into public.learning_units(
  path_id, position, title, description, skill, level, content,
  estimated_minutes, unlock_mastery
)
select path.id, seed.position, seed.title::jsonb, seed.description::jsonb,
  seed.skill, seed.level, seed.content::jsonb, seed.minutes, seed.mastery
from path
cross join (values
  (1, '{"vi":"Chào hỏi và từ nền tảng","en":"Greetings and core words","ja":"あいさつと基本単語","th":"คำทักทายและคำพื้นฐาน"}', '{"vi":"Nhận biết và dùng từ trong tình huống chào hỏi.","en":"Recognize and use words in greeting situations.","ja":"あいさつで使う単語を学びます。","th":"เรียนรู้คำศัพท์ที่ใช้ในการทักทาย"}', 'vocabulary', 'A1', '{"theme":"greetings","mascot":"wave"}', 18, 60),
  (2, '{"vi":"Câu đơn hằng ngày","en":"Everyday simple sentences","ja":"日常の基本文","th":"ประโยคง่ายในชีวิตประจำวัน"}', '{"vi":"Sắp xếp và điền từ trong câu hiện tại đơn.","en":"Order and complete present-simple sentences.","ja":"現在形の文を並べて完成させます。","th":"เรียงและเติมประโยค present simple"}', 'grammar', 'A1', '{"theme":"daily","mascot":"think"}', 20, 62),
  (3, '{"vi":"Nghe từ khóa cơ bản","en":"Basic listening keywords","ja":"基本キーワードの聞き取り","th":"ฟังคีย์เวิร์ดพื้นฐาน"}', '{"vi":"Nghe câu ngắn và nhận biết thông tin chính.","en":"Listen to short sentences and identify key information.","ja":"短い文から重要な情報を聞き取ります。","th":"ฟังประโยคสั้นและจับข้อมูลสำคัญ"}', 'listening', 'A1', '{"theme":"listening","mascot":"listen"}', 20, 62),
  (4, '{"vi":"Tự giới thiệu","en":"Introduce yourself","ja":"自己紹介","th":"แนะนำตัวเอง"}', '{"vi":"Nói tên, công việc, sở thích và mục tiêu.","en":"Talk about your name, work, interests, and goals.","ja":"名前、仕事、趣味、目標を話します。","th":"พูดถึงชื่อ งาน ความสนใจ และเป้าหมาย"}', 'speaking', 'A1', '{"theme":"introduction","mascot":"speak"}', 22, 65),
  (5, '{"vi":"Thói quen và thời gian","en":"Routines and time","ja":"習慣と時間","th":"กิจวัตรและเวลา"}', '{"vi":"Học cụm từ về lịch trình và tần suất.","en":"Learn phrases for schedules and frequency.","ja":"予定と頻度の表現を学びます。","th":"เรียนวลีเกี่ยวกับตารางเวลาและความถี่"}', 'vocabulary', 'A2', '{"theme":"routines","mascot":"cards"}', 24, 66),
  (6, '{"vi":"Ý chính trong đoạn đọc","en":"Main ideas in reading","ja":"読解の主旨","th":"ใจความสำคัญในการอ่าน"}', '{"vi":"Đọc lướt, tìm chi tiết và suy luận đơn giản.","en":"Skim, scan, and make simple inferences.","ja":"速読、情報検索、簡単な推論を練習します。","th":"ฝึกอ่านเร็ว ค้นหารายละเอียด และอนุมาน"}', 'reading', 'A2', '{"theme":"reading","mascot":"read"}', 28, 68),
  (7, '{"vi":"Hội thoại đời sống","en":"Everyday conversations","ja":"日常会話","th":"บทสนทนาในชีวิตประจำวัน"}', '{"vi":"Nghe ý chính, con số và từ nối.","en":"Listen for gist, numbers, and connectors.","ja":"要点、数字、接続語を聞き取ります。","th":"ฟังใจความ ตัวเลข และคำเชื่อม"}', 'listening', 'A2', '{"theme":"conversation","mascot":"listen"}', 28, 68),
  (8, '{"vi":"Xây dựng câu tự nhiên","en":"Build natural sentences","ja":"自然な文を作る","th":"สร้างประโยคอย่างเป็นธรรมชาติ"}', '{"vi":"Dùng trạng từ, giới từ và liên từ đúng vị trí.","en":"Place adverbs, prepositions, and connectors correctly.","ja":"副詞、前置詞、接続語を正しく配置します。","th":"วางคำวิเศษณ์ บุพบท และคำเชื่อมให้ถูกต้อง"}', 'grammar', 'A2', '{"theme":"sentence-building","mascot":"think"}', 30, 70),
  (9, '{"vi":"Viết đoạn văn mạch lạc","en":"Write a coherent paragraph","ja":"まとまりのある段落","th":"เขียนย่อหน้าอย่างเป็นระบบ"}', '{"vi":"Viết câu chủ đề, lý do, ví dụ và kết luận.","en":"Write a topic sentence, reasons, examples, and a conclusion.","ja":"主題文、理由、例、結論を書きます。","th":"เขียนประโยคหัวข้อ เหตุผล ตัวอย่าง และบทสรุป"}', 'writing', 'B1', '{"theme":"writing","mascot":"write"}', 34, 72),
  (10, '{"vi":"Trình bày quan điểm","en":"Express opinions","ja":"意見を述べる","th":"แสดงความคิดเห็น"}', '{"vi":"Nói có cấu trúc và phản hồi câu hỏi tiếp nối.","en":"Speak with structure and answer follow-up questions.","ja":"構成を意識して話し、追加質問に答えます。","th":"พูดอย่างมีโครงสร้างและตอบคำถามต่อเนื่อง"}', 'speaking', 'B1', '{"theme":"opinions","mascot":"speak"}', 34, 74),
  (11, '{"vi":"Đọc tình huống thực tế","en":"Real-world reading","ja":"実践的な読解","th":"การอ่านในสถานการณ์จริง"}', '{"vi":"Phân tích email, thông báo và bài viết ngắn.","en":"Analyze emails, notices, and short articles.","ja":"メール、案内、短い記事を分析します。","th":"วิเคราะห์อีเมล ประกาศ และบทความสั้น"}', 'reading', 'B2', '{"theme":"real-world","mascot":"read"}', 38, 76),
  (12, '{"vi":"Thử thách phản xạ nâng cao","en":"Advanced fluency challenge","ja":"上級流暢さチャレンジ","th":"ความท้าทายความคล่องขั้นสูง"}', '{"vi":"Kết hợp nghe, nói, đọc và viết trong một checkpoint.","en":"Combine listening, speaking, reading, and writing in one checkpoint.","ja":"聞く・話す・読む・書くを一つの課題で統合します。","th":"รวมการฟัง พูด อ่าน และเขียนในด่านเดียว"}', 'speaking', 'C1', '{"theme":"fluency","mascot":"champion"}', 45, 80)
) seed(position,title,description,skill,level,content,minutes,mastery)
on conflict (path_id, position) do update set
  title = excluded.title,
  description = excluded.description,
  skill = excluded.skill,
  level = excluded.level,
  content = excluded.content,
  estimated_minutes = excluded.estimated_minutes,
  unlock_mastery = excluded.unlock_mastery;

with seed(position, skill, kind, prompt, passage, options, answer, explanation, difficulty) as (
  values
  (1,'vocabulary','match_meaning','{"vi":"Chọn nghĩa đúng của “greet”.","en":"Choose the correct meaning of “greet”.","ja":"「greet」の正しい意味を選んでください。","th":"เลือกความหมายที่ถูกต้องของ “greet”"}',null,'[{"id":"a","text":"chào hỏi / to welcome someone"},{"id":"b","text":"rời đi / to leave"},{"id":"c","text":"quên / to forget"}]','{"value":"a"}','{"vi":"Greet nghĩa là chào hỏi hoặc đón tiếp.","en":"Greet means to welcome or say hello.","ja":"Greet は挨拶するという意味です。","th":"Greet หมายถึงทักทาย"}','A1'),
  (1,'vocabulary','fill_blank','{"vi":"Điền từ: Nice to ___ you.","en":"Fill the blank: Nice to ___ you.","ja":"空欄を埋めてください: Nice to ___ you.","th":"เติมคำ: Nice to ___ you."}',null,'[]','{"value":"meet"}','{"vi":"Cụm cố định là Nice to meet you.","en":"The fixed expression is Nice to meet you.","ja":"定型表現は Nice to meet you です。","th":"สำนวนที่ถูกต้องคือ Nice to meet you"}','A1'),
  (2,'grammar','sentence_order','{"vi":"Sắp xếp câu đúng.","en":"Put the sentence in the correct order.","ja":"正しい語順に並べてください。","th":"เรียงประโยคให้ถูกต้อง"}',null,'[{"id":"1","text":"I"},{"id":"2","text":"study"},{"id":"3","text":"English"},{"id":"4","text":"every day"}]','{"text":"I study English every day"}','{"vi":"Trật tự cơ bản: chủ ngữ + động từ + tân ngữ + thời gian.","en":"Basic order: subject + verb + object + time.","ja":"基本語順は主語＋動詞＋目的語＋時間です。","th":"ลำดับพื้นฐานคือ ประธาน + กริยา + กรรม + เวลา"}','A1'),
  (2,'grammar','fill_blank','{"vi":"Điền động từ: She ___ coffee every morning.","en":"Complete: She ___ coffee every morning.","ja":"動詞を入れてください: She ___ coffee every morning.","th":"เติมคำกริยา: She ___ coffee every morning."}',null,'[]','{"value":"drinks"}','{"vi":"She là ngôi thứ ba số ít nên dùng drinks.","en":"Use drinks for third-person singular she.","ja":"三人称単数なので drinks を使います。","th":"She เป็นเอกพจน์บุรุษที่สาม จึงใช้ drinks"}','A1'),
  (3,'listening','dictation','{"vi":"Nghe và chép lại câu ngắn.","en":"Listen and write the short sentence.","ja":"短い文を聞いて書いてください。","th":"ฟังและเขียนประโยคสั้น"}',null,'[]','{"text":"My class starts at nine o clock"}','{"vi":"Chú ý starts và at nine.","en":"Notice starts and at nine.","ja":"starts と at nine に注意してください。","th":"สังเกตคำว่า starts และ at nine"}','A1'),
  (3,'listening','multiple_choice','{"vi":"Nghe câu và chọn thời gian đúng: The train leaves at half past six.","en":"Listen and choose the correct time: The train leaves at half past six.","ja":"文を聞いて正しい時刻を選んでください。","th":"ฟังและเลือกเวลาที่ถูกต้อง"}',null,'[{"id":"a","text":"6:15"},{"id":"b","text":"6:30"},{"id":"c","text":"7:30"}]','{"value":"b"}','{"vi":"Half past six là 6:30.","en":"Half past six means 6:30.","ja":"half past six は6時30分です。","th":"Half past six คือ 6:30"}','A1'),
  (4,'speaking','speaking','{"vi":"Tự giới thiệu trong 3 câu.","en":"Introduce yourself in three sentences.","ja":"3文で自己紹介してください。","th":"แนะนำตัวเองเป็นสามประโยค","model":"My name is Alex. I work in design. I am learning English for travel."}',null,'[]','{"keywords":["name","work","learning","English"]}','{"vi":"Nói rõ tên, công việc và mục tiêu học.","en":"Clearly state your name, work, and learning goal.","ja":"名前、仕事、学習目標を明確に話しましょう。","th":"พูดชื่อ งาน และเป้าหมายการเรียนให้ชัดเจน"}','A1'),
  (4,'speaking','short_answer','{"vi":"Trả lời: What do you do?","en":"Answer: What do you do?","ja":"答えてください: What do you do?","th":"ตอบคำถาม: What do you do?"}',null,'[]','{"text":"I work"}','{"vi":"Có thể trả lời I work as... hoặc I am a...","en":"You can answer I work as... or I am a...","ja":"I work as... または I am a... と答えられます。","th":"ตอบได้ว่า I work as... หรือ I am a..."}','A1'),
  (5,'vocabulary','match_meaning','{"vi":"Chọn nghĩa của “occasionally”.","en":"Choose the meaning of “occasionally”.","ja":"「occasionally」の意味を選んでください。","th":"เลือกความหมายของ “occasionally”"}',null,'[{"id":"a","text":"always"},{"id":"b","text":"sometimes"},{"id":"c","text":"never"}]','{"value":"b"}','{"vi":"Occasionally gần nghĩa với sometimes.","en":"Occasionally is close in meaning to sometimes.","ja":"Occasionally は sometimes に近い意味です。","th":"Occasionally มีความหมายใกล้กับ sometimes"}','A2'),
  (5,'vocabulary','fill_blank','{"vi":"Điền từ: I ___ go for a walk after dinner.","en":"Fill the blank: I ___ go for a walk after dinner.","ja":"空欄を埋めてください。","th":"เติมคำในช่องว่าง"}',null,'[]','{"value":"usually"}','{"vi":"Usually diễn tả thói quen thường xuyên.","en":"Usually describes a frequent habit.","ja":"Usually は頻繁な習慣を表します。","th":"Usually ใช้อธิบายนิสัยที่ทำบ่อย"}','A2'),
  (6,'reading','multiple_choice','{"vi":"Điều gì giúp hình thành thói quen bền vững?","en":"What helps build a lasting habit?","ja":"長続きする習慣を作るのに役立つことは何ですか。","th":"อะไรช่วยสร้างนิสัยที่ยั่งยืน"}','Small actions repeated consistently are easier to maintain than rare bursts of intense effort.','[{"id":"a","text":"Small consistent actions"},{"id":"b","text":"Rare intense effort"},{"id":"c","text":"Avoiding a schedule"}]','{"value":"a"}','{"vi":"Đoạn văn nhấn mạnh hành động nhỏ nhưng đều đặn.","en":"The passage emphasizes small consistent actions.","ja":"文章は小さな行動の継続を強調しています。","th":"ข้อความเน้นการกระทำเล็กๆ อย่างสม่ำเสมอ"}','A2'),
  (6,'reading','true_false','{"vi":"Đúng hay sai: Nỗ lực rất mạnh nhưng hiếm khi luôn tốt hơn.","en":"True or false: Rare intense effort is always better.","ja":"正誤: たまの強い努力の方が常に良い。","th":"จริงหรือเท็จ: ความพยายามหนักเป็นครั้งคราวดีกว่าเสมอ"}','Small actions repeated consistently are easier to maintain than rare bursts of intense effort.','[{"id":"true","text":"True"},{"id":"false","text":"False"}]','{"value":"false"}','{"vi":"Đoạn văn nói điều ngược lại.","en":"The passage says the opposite.","ja":"文章は反対のことを述べています。","th":"ข้อความกล่าวตรงกันข้าม"}','A2'),
  (7,'listening','dictation','{"vi":"Nghe và chép câu về lịch hẹn.","en":"Listen and write the appointment sentence.","ja":"予定に関する文を聞いて書いてください。","th":"ฟังและเขียนประโยคเกี่ยวกับนัดหมาย"}',null,'[]','{"text":"Could we move the meeting to Thursday afternoon"}','{"vi":"Chú ý Could we move và Thursday afternoon.","en":"Notice Could we move and Thursday afternoon.","ja":"Could we move と Thursday afternoon に注意しましょう。","th":"สังเกต Could we move และ Thursday afternoon"}','A2'),
  (7,'listening','multiple_choice','{"vi":"Người nói muốn đổi cuộc họp sang khi nào?","en":"When does the speaker want to move the meeting?","ja":"話者は会議をいつに変更したいですか。","th":"ผู้พูดต้องการเลื่อนประชุมไปเมื่อใด"}',null,'[{"id":"a","text":"Tuesday morning"},{"id":"b","text":"Thursday afternoon"},{"id":"c","text":"Friday evening"}]','{"value":"b"}','{"vi":"Câu nghe nêu Thursday afternoon.","en":"The sentence states Thursday afternoon.","ja":"文では Thursday afternoon と述べています。","th":"ประโยคระบุ Thursday afternoon"}','A2'),
  (8,'grammar','sentence_order','{"vi":"Sắp xếp câu tự nhiên.","en":"Build the natural sentence.","ja":"自然な文に並べてください。","th":"เรียงเป็นประโยคธรรมชาติ"}',null,'[{"id":"1","text":"She"},{"id":"2","text":"usually"},{"id":"3","text":"reads"},{"id":"4","text":"before bed"}]','{"text":"She usually reads before bed"}','{"vi":"Trạng từ tần suất đứng trước động từ thường.","en":"Frequency adverbs come before the main verb.","ja":"頻度副詞は一般動詞の前に置きます。","th":"คำวิเศษณ์บอกความถี่อยู่หน้ากริยาหลัก"}','A2'),
  (8,'grammar','fill_blank','{"vi":"Điền liên từ: I was tired, ___ I finished the lesson.","en":"Fill the connector: I was tired, ___ I finished the lesson.","ja":"接続語を入れてください。","th":"เติมคำเชื่อม"}',null,'[]','{"value":"but"}','{"vi":"But thể hiện sự tương phản.","en":"But expresses contrast.","ja":"But は対比を表します。","th":"But แสดงความขัดแย้ง"}','A2'),
  (9,'writing','essay','{"vi":"Viết 80–120 từ về một thói quen học hiệu quả.","en":"Write 80–120 words about an effective study habit.","ja":"効果的な学習習慣について80〜120語で書いてください。","th":"เขียน 80–120 คำเกี่ยวกับนิสัยการเรียนที่มีประสิทธิภาพ"}',null,'[]','{"min_words":80,"max_words":120}','{"vi":"Dùng câu chủ đề, ví dụ và kết luận.","en":"Use a topic sentence, an example, and a conclusion.","ja":"主題文、例、結論を使いましょう。","th":"ใช้ประโยคหัวข้อ ตัวอย่าง และบทสรุป"}','B1'),
  (9,'writing','sentence_order','{"vi":"Sắp xếp câu mở đoạn.","en":"Order the paragraph opening.","ja":"段落の冒頭を並べてください。","th":"เรียงประโยคเปิดย่อหน้า"}',null,'[{"id":"1","text":"One effective habit"},{"id":"2","text":"is reviewing notes"},{"id":"3","text":"for ten minutes"},{"id":"4","text":"every evening"}]','{"text":"One effective habit is reviewing notes for ten minutes every evening"}','{"vi":"Câu mở đoạn nêu rõ thói quen và thời điểm.","en":"The opening clearly states the habit and timing.","ja":"冒頭文は習慣と時間を明確に示します。","th":"ประโยคเปิดระบุนิสัยและเวลาอย่างชัดเจน"}','B1'),
  (10,'speaking','speaking','{"vi":"Nêu quan điểm về học online và đưa một lý do.","en":"Give your opinion about online learning and one reason.","ja":"オンライン学習について意見と理由を一つ述べてください。","th":"แสดงความคิดเห็นเกี่ยวกับการเรียนออนไลน์พร้อมเหตุผลหนึ่งข้อ","model":"In my opinion, online learning is useful because it gives learners more flexibility."}',null,'[]','{"keywords":["opinion","online","learning","because"]}','{"vi":"Dùng cấu trúc In my opinion... because...","en":"Use the structure In my opinion... because...","ja":"In my opinion... because... の形を使いましょう。","th":"ใช้โครงสร้าง In my opinion... because..."}','B1'),
  (10,'speaking','short_answer','{"vi":"Trả lời câu hỏi tiếp nối: Can you give an example?","en":"Answer the follow-up: Can you give an example?","ja":"追加質問に答えてください: Can you give an example?","th":"ตอบคำถามต่อเนื่อง: Can you give an example?"}',null,'[]','{"text":"For example"}','{"vi":"Mở đầu bằng For example và nêu tình huống cụ thể.","en":"Start with For example and give a specific situation.","ja":"For example で始め、具体例を述べましょう。","th":"เริ่มด้วย For example และยกสถานการณ์เฉพาะ"}','B1'),
  (11,'reading','multiple_choice','{"vi":"Mục đích chính của email là gì?","en":"What is the main purpose of the email?","ja":"このメールの主な目的は何ですか。","th":"จุดประสงค์หลักของอีเมลคืออะไร"}','Please note that the workshop has moved from Room 2 to Room 5. The start time remains 9:30 a.m.','[{"id":"a","text":"Change the room"},{"id":"b","text":"Cancel the workshop"},{"id":"c","text":"Change the start time"}]','{"value":"a"}','{"vi":"Email chỉ thông báo đổi phòng.","en":"The email only announces a room change.","ja":"メールは会場変更のみを知らせています。","th":"อีเมลแจ้งเปลี่ยนห้องเท่านั้น"}','B2'),
  (11,'reading','true_false','{"vi":"Đúng hay sai: Giờ bắt đầu đã thay đổi.","en":"True or false: The start time has changed.","ja":"正誤: 開始時刻が変更された。","th":"จริงหรือเท็จ: เวลาเริ่มเปลี่ยนแล้ว"}','Please note that the workshop has moved from Room 2 to Room 5. The start time remains 9:30 a.m.','[{"id":"true","text":"True"},{"id":"false","text":"False"}]','{"value":"false"}','{"vi":"Giờ bắt đầu vẫn là 9:30.","en":"The start time remains 9:30.","ja":"開始時刻は9時30分のままです。","th":"เวลาเริ่มยังคงเป็น 9:30"}','B2'),
  (12,'speaking','speaking','{"vi":"Tóm tắt một vấn đề, nêu giải pháp và kết luận trong 60 giây.","en":"Summarize a problem, propose a solution, and conclude in 60 seconds.","ja":"問題を要約し、解決策と結論を60秒で述べてください。","th":"สรุปปัญหา เสนอวิธีแก้ และสรุปภายใน 60 วินาที","model":"The main issue is limited practice time. A practical solution is to schedule short daily sessions. Overall, consistency matters most."}',null,'[]','{"keywords":["issue","solution","daily","overall"]}','{"vi":"Bài nói cần đủ vấn đề, giải pháp và kết luận.","en":"Include the problem, solution, and conclusion.","ja":"問題、解決策、結論を含めてください。","th":"ควรมีปัญหา วิธีแก้ และบทสรุป"}','C1'),
  (12,'writing','essay','{"vi":"Viết 140–180 từ phản biện quan điểm: AI có thể thay thế hoàn toàn giáo viên ngôn ngữ.","en":"Write 140–180 words responding to: AI can completely replace language teachers.","ja":"「AIは語学教師を完全に代替できる」という意見に140〜180語で論じてください。","th":"เขียน 140–180 คำโต้แย้งประเด็น AI สามารถแทนครูภาษาได้ทั้งหมด"}',null,'[]','{"min_words":140,"max_words":180}','{"vi":"Cân bằng lợi ích, giới hạn và kết luận rõ ràng.","en":"Balance benefits, limitations, and a clear conclusion.","ja":"利点、限界、明確な結論をバランスよく述べましょう。","th":"สมดุลข้อดี ข้อจำกัด และบทสรุปที่ชัดเจน"}','C1')
)
insert into public.practice_questions(
  unit_id, skill, question_type, prompt, passage, options, answer_key,
  explanation, difficulty, is_public
)
select unit.id, seed.skill, seed.kind, seed.prompt::jsonb, seed.passage,
  seed.options::jsonb, seed.answer::jsonb, seed.explanation::jsonb,
  seed.difficulty, true
from seed
join public.learning_paths path
  on path.slug = 'english-foundations-a1-b1'
join public.learning_units unit
  on unit.path_id = path.id and unit.position = seed.position
where not exists (
  select 1 from public.practice_questions existing
  where existing.unit_id = unit.id
    and existing.question_type = seed.kind
    and existing.prompt->>'en' = seed.prompt::jsonb->>'en'
);

insert into public.challenge_question_pool(challenge_id, question_id, position)
select challenge.id, question.id,
  row_number() over (
    partition by challenge.id order by question.difficulty, question.created_at, question.id
  )::integer
from public.learning_challenges challenge
join public.practice_questions question
  on question.is_public
  and (challenge.skill is null or challenge.skill = question.skill)
where challenge.is_published
on conflict (challenge_id, question_id) do nothing;

update public.learning_paths set
  title = title || jsonb_build_object(
    'ja', coalesce(title->>'ja', title->>'en', title->>'vi', ''),
    'th', coalesce(title->>'th', title->>'en', title->>'vi', '')
  ),
  description = description || jsonb_build_object(
    'ja', coalesce(description->>'ja', description->>'en', description->>'vi', ''),
    'th', coalesce(description->>'th', description->>'en', description->>'vi', '')
  );

update public.learning_paths
set description = description || jsonb_build_object(
  'ja', '語彙、文法、4技能をバランスよく伸ばす学習ロードマップです。',
  'th', 'เส้นทางการเรียนที่สมดุลทั้งคำศัพท์ ไวยากรณ์ และทักษะทั้งสี่'
)
where slug = 'english-foundations-a1-b1';

update public.practice_questions set
  prompt = prompt || jsonb_build_object(
    'ja', coalesce(prompt->>'ja', prompt->>'en', prompt->>'vi', ''),
    'th', coalesce(prompt->>'th', prompt->>'en', prompt->>'vi', '')
  ),
  explanation = coalesce(explanation, '{}'::jsonb) || jsonb_build_object(
    'ja', coalesce(explanation->>'ja', explanation->>'en', explanation->>'vi', ''),
    'th', coalesce(explanation->>'th', explanation->>'en', explanation->>'vi', '')
  );

update public.learning_challenges set
  title = title || jsonb_build_object(
    'ja', coalesce(title->>'ja', title->>'en', title->>'vi', ''),
    'th', coalesce(title->>'th', title->>'en', title->>'vi', '')
  ),
  description = description || jsonb_build_object(
    'ja', coalesce(description->>'ja', description->>'en', description->>'vi', ''),
    'th', coalesce(description->>'th', description->>'en', description->>'vi', '')
  );

update public.feature_unlock_catalog set
  name = name || jsonb_build_object(
    'ja', coalesce(name->>'ja', name->>'en', name->>'vi', ''),
    'th', coalesce(name->>'th', name->>'en', name->>'vi', '')
  ),
  description = description || jsonb_build_object(
    'ja', coalesce(description->>'ja', description->>'en', description->>'vi', ''),
    'th', coalesce(description->>'th', description->>'en', description->>'vi', '')
  );
