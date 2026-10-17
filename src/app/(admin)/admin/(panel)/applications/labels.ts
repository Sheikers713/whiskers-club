import type { ApplicationStatus } from "@prisma/client";

export const typeLabels = { ADOPTION: "Укотовление", VOLUNTEER: "Волонтёр", FOSTER: "Передержка", PARTNERSHIP: "Партнёрство" } as const;
// The workflow the team uses. CONTACTED, COMPLETED and WITHDRAWN stay in the
// database enum but are no longer offered; old rows were moved by a migration.
export const statusLabels: Partial<Record<ApplicationStatus, string>> = {
  NEW: "Новая",
  INTERVIEW: "Беседа",
  MEETING: "Пробный период",
  APPROVED: "Одобрена",
  REJECTED: "Отказ",
};
export const answerLabels: Record<string, string> = {
  household: "Кто живёт",
  kids: "Дети",
  pets: "Другие животные",
  housing: "Жильё",
  experience: "Опыт",
  indoorOnly: "Без самовыгула",
  aboutHome: "О доме",
  how: "Чем помочь",
  availability: "Когда свободен",
  conditions: "Условия",
  duration: "Срок",
  organization: "Организация",
  offer: "Предложение",
};
