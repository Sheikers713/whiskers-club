/**
 * Guesses an expense category from «На что», so nobody has to pick one by
 * hand. Used for statistics only; the admin can still change it in the full
 * form. Keys match the seeded ExpenseCategory rows; unknown text is «other».
 */
const RULES: [key: string, words: string[]][] = [
  ["foster", ["передерж", "ситтер", "sitter"]],
  ["litter", ["наполнител", "песок", "litter"]],
  ["transport", ["такси", "транспорт", "bolt", "yandex go", "car:go", "бензин", "автобус"]],
  ["administration", ["реклам", "печать", "хостинг", "домен", "сайт"]],
  ["equipment", ["переноск", "лоток", "миск", "когтеточ", "лежанк", "домик", "игрушк"]],
  ["veterinary", ["операц", "ветеринар", "врач", "прием", "приём", "осмотр", "вакцин", "привив", "стерилиз", "кастрац", "терапи", "клиник", "чип", "узи", "рентген", "vet"]],
  ["tests", ["анализ", "тест ", "тесты", "пцр", "биохим"]],
  ["food", ["корм", "hills", "monge", "royal", "digestive", "recovery", "gastro", "паштет", "пауч", "консерв", "purina", "brit"]],
  ["medication", ["лекарств", "глистогон", "капл", "укол", "антибиот", "таблет", "мазь", "крем", "шампун", "пробиот", "синбиот", "капельниц", "игл", "шприц", "стронгхолд", "адвокат", "панакур", "вигамокс", "аптек"]],
];

export function guessCategoryKey(text: string): string {
  const l = text.toLowerCase();
  for (const [key, words] of RULES) if (words.some((w) => l.includes(w))) return key;
  return "other";
}
