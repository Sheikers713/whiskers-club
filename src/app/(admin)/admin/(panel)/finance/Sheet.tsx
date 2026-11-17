"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CatPicker, type PickerCat } from "@/components/admin/CatPicker";
import {
  addDonationRow,
  addExpenseReceipt,
  addExpenseRow,
  deleteDonationRow,
  deleteExpenseRow,
  updateDonationField,
  updateExpenseCats,
  updateExpenseField,
  type DonationField,
  type ExpenseField,
  type SheetResult,
} from "@/lib/actions/sheet";
import { actionFailed, isNextControlFlow } from "@/lib/action-error";
import { reportClientError, shrinkFormFiles } from "@/lib/upload-shrink";

/**
 * The money table as an editable sheet: click a cell, change it, press Enter
 * or click away, and it is saved. The first row of each table adds a new
 * record. Everything else (category, campaign, public texts) stays in the
 * full form behind the date link.
 */

export type SheetExpense = {
  id: string;
  date: string; // YYYY-MM-DD
  amountRsd: number;
  share: number;
  description: string;
  catIds: string[];
  fileIds: string[];
  /** Receipt link from the sheet import (Google Drive), when no file is stored. */
  driveUrl: string | null;
  proof: string;
  noReceiptReason: string | null;
  state: string;
  addedBy: string;
};

export type SheetDonation = {
  id: string;
  date: string;
  amountRsd: number;
  donorName: string | null;
  method: string | null;
  catId: string | null;
  campaign: string | null;
  /** Part of one donation split between several cats (one row per cat). */
  split?: { total: number; cats: string[] } | null;
  state: string;
  addedBy: string;
};

type Option = PickerCat;

const cell = "border border-line p-0 align-top";
const head = "whitespace-nowrap border border-line bg-milk px-2 py-1.5 text-left text-sm font-semibold";
const input =
  "block w-full min-w-0 bg-transparent px-2 py-1.5 outline-none focus:bg-paper focus:ring-2 focus:ring-inset focus:ring-ink/40 disabled:opacity-50";
const n = (v: number) => new Intl.NumberFormat("ru-RU").format(v);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(new Date());

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (job: () => Promise<SheetResult>, after?: () => void, sent?: FormData) =>
    start(async () => {
      let res: SheetResult;
      try {
        res = await job();
      } catch (e) {
        if (isNextControlFlow(e)) throw e;
        console.error(e);
        reportClientError("finance-sheet", e, sent);
        setError(actionFailed(e));
        return;
      }
      if ("error" in res) setError(res.error);
      else {
        setError(null);
        after?.();
        router.refresh();
      }
    });
  return { pending, error, run };
}

function Cell({
  value,
  save,
  type = "text",
  align,
  list,
  placeholder,
}: {
  value: string;
  save: (v: string) => Promise<SheetResult>;
  type?: "text" | "date" | "number";
  align?: "right";
  list?: string;
  placeholder?: string;
}) {
  const { pending, error, run } = useSave();
  const [v, setV] = useState(value);
  const [last, setLast] = useState(value);
  // A refresh from the server replaces the value unless the cell is being edited.
  if (value !== last) {
    setLast(value);
    setV(value);
  }
  const commit = () => {
    if (v.trim() === value.trim()) return;
    run(() => save(v));
  };
  return (
    <div className="relative">
      <input
        type={type}
        value={v}
        list={list}
        placeholder={placeholder}
        inputMode={type === "number" ? "numeric" : undefined}
        disabled={pending}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setV(value);
        }}
        className={`${input} ${align === "right" ? "text-right tabular-nums" : ""} ${error ? "bg-brick/10 ring-2 ring-inset ring-brick" : ""}`}
        title={error ?? undefined}
      />
      {error && <span className="block px-2 pb-1 text-xs text-brick">{error}</span>}
    </div>
  );
}

function ReceiptCell({ e }: { e: SheetExpense }) {
  const { pending, error, run } = useSave();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <div className="px-2 py-1.5">
      {e.driveUrl && (
        <a href={e.driveUrl} target="_blank" rel="noreferrer" className="mr-2 text-brick underline">
          чек (Drive)
        </a>
      )}
      {e.fileIds.map((f, i) => (
        <a key={f} href={`/admin/files/${f}`} target="_blank" className="mr-2 text-brick underline">
          чек{e.fileIds.length > 1 ? ` ${i + 1}` : ""}
        </a>
      ))}
      <form ref={ref} className="inline">
        <input type="hidden" name="id" value={e.id} />
        <label className={`cursor-pointer whitespace-nowrap text-xs text-ink-soft underline decoration-dotted ${pending ? "opacity-50" : ""}`}>
          {pending ? "загружаю…" : e.fileIds.length || e.driveUrl ? "+ ещё" : "+ чек"}
          <input
            type="file"
            name="files"
            accept="image/*,application/pdf"
            multiple
            className="sr-only"
            disabled={pending}
            onChange={async () => {
              if (!ref.current) return;
              const fd = await shrinkFormFiles(new FormData(ref.current));
              run(() => addExpenseReceipt(fd), undefined, fd);
            }}
          />
        </label>
      </form>
      {error && <span className="block text-xs text-brick">{error}</span>}
    </div>
  );
}

/**
 * Below xl only one sheet is shown and it is wider than a phone: the table
 * scrolls sideways inside its own box instead of pushing the page wider.
 * `relative` matters: the hidden (sr-only) file and checkbox inputs are
 * absolutely positioned, and without a positioned ancestor here they sit
 * outside the scroll box, past the screen edge, and iOS Safari zooms the
 * whole page out to fit them.
 */
const scroller = "relative max-xl:overflow-x-auto max-xl:overscroll-x-contain";

const addBtn = "m-1 rounded bg-ink px-3 py-1 text-xs font-semibold text-milk hover:bg-brick";

/** Under the date: link to the full form, who added the row, «удалить». */
function RowMeta({ href, state, addedBy, del }: { href: string; state: string; addedBy: string; del: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 px-2 pb-1 text-xs text-ink-soft">
      <Link href={href} className="hover:underline">
        открыть{state !== "PUBLISHED" ? (state === "DRAFT" ? " · черновик" : " · скрыто") : ""}
      </Link>
      {del}
      {addedBy && <span className="basis-full truncate" title={`Внёс: ${addedBy}`}>{addedBy}</span>}
    </div>
  );
}

/** «Удалить» with a confirmation; the audit log keeps what was deleted. */
function DeleteButton({ what, run }: { what: string; run: () => Promise<SheetResult> }) {
  const { pending, error, run: go } = useSave();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => window.confirm(`Удалить ${what}? Это нельзя отменить.`) && go(run)}
        className="text-xs text-ink-soft underline decoration-dotted hover:text-brick disabled:opacity-50"
      >
        {pending ? "удаляю…" : "удалить"}
      </button>
      {error && <span className="block text-xs text-brick">{error}</span>}
    </>
  );
}

function AddForm({ id, action, children }: { id: string; action: (fd: FormData) => Promise<SheetResult>; children: React.ReactNode }) {
  const { pending, error, run } = useSave();
  // Bumped after a save so the add row (including its cat choice) starts clean.
  const [round, setRound] = useState(0);
  return (
    <>
      <form
        id={id}
        onSubmit={(ev) => {
          ev.preventDefault();
          const form = ev.currentTarget;
          run(() => action(new FormData(form)), () => {
            form.reset();
            setRound((r) => r + 1);
          });
        }}
        aria-busy={pending}
      />
      <div key={round}>{children}</div>
      {error && <p className="mt-1 text-sm text-brick">{error}</p>}
    </>
  );
}

export function ExpenseSheet({
  rows,
  cats,
  defaultCatIds,
}: {
  rows: SheetExpense[];
  cats: Option[];
  defaultCatIds: string[];
}) {
  const save = useSave();
  return (
    <AddForm id="add-expense" action={addExpenseRow}>
      <div className={scroller}>
      <table className="w-full min-w-[40rem] border-collapse text-sm xl:min-w-0">
        <thead>
          <tr>
            <th className={`${head} w-[8.25rem]`}>Дата</th>
            <th className={`${head} w-20`}>Сумма</th>
            <th className={head}>На что</th>
            <th className={`${head} w-28`}>Коты</th>
            <th className={`${head} w-28`}>Чеки</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-milk/60">
            <td className={cell}>
              <input form="add-expense" name="date" type="date" defaultValue={today()} required className={input} />
              <button form="add-expense" className={addBtn}>+ Добавить</button>
            </td>
            <td className={cell}><input form="add-expense" name="amountRsd" inputMode="numeric" placeholder="сумма" required className={`${input} text-right`} /></td>
            <td className={cell}>
              <input form="add-expense" name="description" placeholder="на что потрачено" required className={input} />
            </td>
            <td className={cell}>
              <CatPicker variant="cell" cats={cats} name="cats" form="add-expense" defaultValue={defaultCatIds} />
            </td>
            <td className={cell}>
              <input form="add-expense" name="files" type="file" accept="image/*,application/pdf" multiple className="block w-full px-2 py-1 text-xs" />
              <input form="add-expense" name="noReceiptReason" placeholder="или почему без чека" className={`${input} text-xs`} />
            </td>
          </tr>
          {rows.map((e) => (
            <tr key={e.id} className="hover:bg-milk/40">
              <td className={cell}>
                <Cell type="date" value={e.date} save={(v) => updateExpenseField(e.id, "date", v)} />
                <RowMeta
                  href={`/admin/expenses/${e.id}`}
                  state={e.state}
                  addedBy={e.addedBy}
                  del={<DeleteButton what={`расход ${n(e.amountRsd)} RSD «${e.description}»`} run={() => deleteExpenseRow(e.id)} />}
                />
              </td>
              <td className={cell}>
                <Cell align="right" value={String(e.amountRsd)} save={(v) => updateExpenseField(e.id, "amountRsd" as ExpenseField, v)} />
                {e.share !== e.amountRsd && <span className="block px-2 pb-1 text-right text-xs text-ink-soft">доля {n(e.share)}</span>}
              </td>
              <td className={cell}><Cell value={e.description} save={(v) => updateExpenseField(e.id, "description", v)} /></td>
              <td className={cell}>
                <CatPicker variant="cell" cats={cats} defaultValue={e.catIds} onClose={(ids) => save.run(() => updateExpenseCats(e.id, ids))} />
              </td>
              <td className={cell}>
                <ReceiptCell e={e} />
                {e.fileIds.length === 0 && !e.driveUrl && (
                  <Cell value={e.noReceiptReason ?? ""} placeholder="почему без чека" save={(v) => updateExpenseField(e.id, "noReceiptReason", v)} />
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className={`${cell} px-2 py-1.5 text-ink-soft`}>Расходов нет.</td></tr>}
        </tbody>
      </table>
      </div>
      {save.error && <p className="mt-1 text-sm text-brick">{save.error}</p>}
    </AddForm>
  );
}

export function DonationSheet({
  rows,
  cats,
  methods,
  defaultCatId,
  fundRows = [],
}: {
  rows: SheetDonation[];
  cats: Option[];
  methods: string[];
  defaultCatId: string;
  /** The opening balance (and cover from it), shown as fixed «zeroth donations» at the bottom. */
  fundRows?: { label: string; hint?: string; amount: number; date: string }[];
}) {
  const save = useSave();
  return (
    <AddForm id="add-donation" action={addDonationRow}>
      <datalist id="donation-methods">
        {methods.map((m) => <option key={m} value={m} />)}
      </datalist>
      <div className={scroller}>
      <table className="w-full min-w-[32rem] border-collapse text-sm xl:min-w-0">
        <thead>
          <tr>
            <th className={`${head} w-[8.25rem]`}>Дата</th>
            <th className={`${head} w-20`}>Сумма</th>
            <th className={head}>От кого</th>
            <th className={`${head} w-28`}>Кот</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-milk/60">
            <td className={cell}>
              <input form="add-donation" name="date" type="date" defaultValue={today()} required className={input} />
              <button form="add-donation" className={addBtn}>+ Добавить</button>
            </td>
            <td className={cell}><input form="add-donation" name="amountRsd" inputMode="numeric" placeholder="сумма" required className={`${input} text-right`} /></td>
            <td className={cell}>
              <input form="add-donation" name="donorName" placeholder="от кого" className={input} />
              <input form="add-donation" name="method" list="donation-methods" placeholder="способ оплаты" className={`${input} text-xs`} />
            </td>
            <td className={cell}>
              <CatPicker variant="cell" multiple={false} cats={cats} name="catId" form="add-donation" defaultValue={defaultCatId ? [defaultCatId] : []} />
            </td>
          </tr>
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-milk/40">
              <td className={cell}>
                <Cell type="date" value={d.date} save={(v) => updateDonationField(d.id, "date", v)} />
                <RowMeta
                  href={`/admin/donations/${d.id}`}
                  state={d.state}
                  addedBy={d.addedBy}
                  del={<DeleteButton what={`донат ${n(d.amountRsd)} RSD${d.donorName ? ` от ${d.donorName}` : ""}`} run={() => deleteDonationRow(d.id)} />}
                />
              </td>
              <td className={cell}>
                <Cell align="right" value={String(d.amountRsd)} save={(v) => updateDonationField(d.id, "amountRsd", v)} />
                {d.split && <span className="block px-2 pb-1 text-right text-xs text-ink-soft">доля из {n(d.split.total)}</span>}
              </td>
              <td className={cell}>
                <Cell value={d.donorName ?? ""} placeholder="Аноним" save={(v) => updateDonationField(d.id, "donorName", v)} />
                <div className="text-xs text-ink-soft">
                  <Cell value={d.method ?? ""} list="donation-methods" placeholder="способ оплаты" save={(v) => updateDonationField(d.id, "method", v)} />
                </div>
              </td>
              <td className={cell}>
                {d.campaign && !d.catId ? (
                  <span className="block px-2 py-1.5">{d.campaign}</span>
                ) : (
                  <CatPicker
                    variant="cell"
                    multiple={false}
                    cats={cats}
                    defaultValue={d.catId ? [d.catId] : []}
                    onClose={(ids) => save.run(() => updateDonationField(d.id, "catId" as DonationField, ids[0] ?? ""))}
                  />
                )}
                {d.split && <span className="block px-2 pb-1 text-xs text-ink-soft">донат на: {d.split.cats.join(", ")}</span>}
              </td>
            </tr>
          ))}
          {fundRows.map((f) => (
            <tr key={f.label} className="bg-milk/60">
              <td className={`${cell} px-2 py-1.5`}>{f.date.split("-").reverse().join(".")}</td>
              <td className={`${cell} px-2 py-1.5 text-right`}>{n(f.amount)}</td>
              <td className={`${cell} px-2 py-1.5`}>
                {f.label}
                {f.hint && <span className="block text-xs text-ink-soft">{f.hint}</span>}
              </td>
              <td className={`${cell} px-2 py-1.5 text-ink-soft`}>Фонд Whiskers Club</td>
            </tr>
          ))}
          {rows.length === 0 && fundRows.length === 0 && <tr><td colSpan={4} className={`${cell} px-2 py-1.5 text-ink-soft`}>Донатов нет.</td></tr>}
        </tbody>
      </table>
      </div>
      {save.error && <p className="mt-1 text-sm text-brick">{save.error}</p>}
    </AddForm>
  );
}

