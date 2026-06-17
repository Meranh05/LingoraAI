create index if not exists learning_reward_claims_question_id_idx
  on private.learning_reward_claims(question_id);
create index if not exists learning_unit_reward_claims_unit_id_idx
  on private.learning_unit_reward_claims(unit_id);

create index if not exists admin_audit_logs_admin_id_idx
  on public.admin_audit_logs(admin_id);
create index if not exists ai_feedback_message_id_idx
  on public.ai_feedback(message_id);
create index if not exists ai_feedback_user_id_idx
  on public.ai_feedback(user_id);
create index if not exists ai_memories_source_message_id_idx
  on public.ai_memories(source_message_id);
create index if not exists billing_transactions_plan_code_idx
  on public.billing_transactions(plan_code);
create index if not exists challenge_question_pool_question_id_idx
  on public.challenge_question_pool(question_id);
create index if not exists chat_messages_session_id_idx
  on public.chat_messages(session_id);
create index if not exists chat_messages_user_id_idx
  on public.chat_messages(user_id);
create index if not exists chat_sessions_document_id_idx
  on public.chat_sessions(document_id);
create index if not exists chat_sessions_user_id_idx
  on public.chat_sessions(user_id);
create index if not exists document_ai_outputs_document_id_idx
  on public.document_ai_outputs(document_id);
create index if not exists document_ai_outputs_user_id_idx
  on public.document_ai_outputs(user_id);
create index if not exists document_chunks_user_id_idx
  on public.document_chunks(user_id);
create index if not exists documents_user_id_idx
  on public.documents(user_id);
create index if not exists learning_paths_created_by_idx
  on public.learning_paths(created_by);
create index if not exists learning_unit_sessions_unit_id_idx
  on public.learning_unit_sessions(unit_id);
create index if not exists practice_attempts_question_id_idx
  on public.practice_attempts(question_id);
create index if not exists practice_questions_owner_id_idx
  on public.practice_questions(owner_id);
create index if not exists quiz_results_user_id_idx
  on public.quiz_results(user_id);
create index if not exists subscriptions_plan_code_idx
  on public.subscriptions(plan_code);
create index if not exists training_candidates_reviewed_by_idx
  on public.training_candidates(reviewed_by);
create index if not exists user_path_enrollments_current_unit_id_idx
  on public.user_path_enrollments(current_unit_id);
create index if not exists user_path_enrollments_path_id_idx
  on public.user_path_enrollments(path_id);
create index if not exists user_question_review_queue_question_id_idx
  on public.user_question_review_queue(question_id);
create index if not exists user_question_review_queue_source_unit_id_idx
  on public.user_question_review_queue(source_unit_id);
create index if not exists user_unit_progress_unit_id_idx
  on public.user_unit_progress(unit_id);
create index if not exists writing_reviews_user_id_idx
  on public.writing_reviews(user_id);
