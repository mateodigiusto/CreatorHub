"use client";

import { cn } from "@/lib/cn";

type Opt<T extends string> = { key: T; label: string; description?: string };

type SingleProps<T extends string> = {
  multi?: false;
  value: T | undefined;
  options: Opt<T>[];
  onChange: (v: T) => void;
};

type MultiProps<T extends string> = {
  multi: true;
  value: T[];
  options: Opt<T>[];
  onChange: (v: T[]) => void;
  /* Cap selection count (optional). */
  max?: number;
};

export function ChipGroup<T extends string>(props: SingleProps<T> | MultiProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {props.options.map((o) => {
        const active = props.multi
          ? props.value.includes(o.key)
          : props.value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => {
              if (props.multi) {
                if (active) {
                  props.onChange(props.value.filter((x) => x !== o.key));
                } else {
                  if (props.max && props.value.length >= props.max) return;
                  props.onChange([...props.value, o.key]);
                }
              } else {
                props.onChange(o.key);
              }
            }}
            className={cn(
              "h-9 px-3.5 rounded-[10px] text-[13px] font-medium border cursor-pointer transition-colors",
              active
                ? "bg-accent-soft text-accent border-accent/40"
                : "bg-surface text-text/80 border-border hover:border-accent/25 hover:text-text"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
