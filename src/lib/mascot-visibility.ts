export function canShowMascotCompanion(
  pathname: string,
  showMascot: boolean,
) {
  return (
    showMascot &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/learn/") &&
    !pathname.startsWith("/ai-tutor")
  );
}
