"use client";

import { useState } from "react";
import { btnSecondaryCls } from "./ui";

/** A visible "choose files" button in Russian instead of the browser's plain file input. */
export function FileInput({
  name,
  label,
  accept,
  multiple,
  required,
}: {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
}) {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <label className={`${btnSecondaryCls} cursor-pointer gap-2 focus-within:outline focus-within:outline-2 focus-within:outline-orange`}>
          <span aria-hidden>📎</span> {multiple ? "Выбрать файлы" : "Выбрать файл"}
          <input
            type="file"
            name={name}
            accept={accept}
            multiple={multiple}
            required={required}
            className="sr-only"
            onChange={(e) => setNames([...(e.target.files ?? [])].map((f) => f.name))}
          />
        </label>
        <span className="text-sm text-ink-soft">
          {names.length === 0 ? "Файл не выбран" : names.length === 1 ? names[0] : `Выбрано файлов: ${names.length}`}
        </span>
      </div>
    </div>
  );
}
