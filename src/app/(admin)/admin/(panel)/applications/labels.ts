export const typeLabels = { ADOPTION: "Усыновление", VOLUNTEER: "Волонтёр", FOSTER: "Передержка", PARTNERSHIP: "Партнёрство" } as const;
export const statusLabels = {
  NEW: "Новая",
  CONTACTED: "Связались",
  INTERVIEW: "Беседа",
  MEETING: "Знакомство",
  APPROVED: "Одобрена",
  REJECTED: "Отказ",
  COMPLETED: "Завершена",
  WITHDRAWN: "Отозвана",
} as const;
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
