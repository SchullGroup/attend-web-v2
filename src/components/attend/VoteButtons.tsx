"use client";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

// Figma's vote control: a plain white bordered button per choice, with only the icon
// carrying the colour. The label stays dark, so an unselected row reads as neutral;
// the selected one takes its choice's border + a faint tint.
// Shared by the Pre-AGM voting sheet and the live Resolution panel so both stay identical.
export const CHOICES: {
  value: VoteChoice;
  label: string;
  icon: typeof CheckCircle2;
  icon_colour: string;
  selected: string;
}[] = [
  { value: "FOR", label: "For", icon: CheckCircle2, icon_colour: "text-primary", selected: "border-primary bg-primary/5" },
  { value: "AGAINST", label: "Against", icon: XCircle, icon_colour: "text-red-500", selected: "border-red-500 bg-red-50" },
  { value: "ABSTAIN", label: "Abstain", icon: MinusCircle, icon_colour: "text-foreground/40", selected: "border-foreground/40 bg-foreground/[0.04]" },
];

export function VoteButtons({
  selected, onSelect, disabled,
}: {
  selected: VoteChoice | null;
  onSelect: (c: VoteChoice) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CHOICES.map(({ value, label, icon: Icon, icon_colour, selected: selectedTone }) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-[10px] border px-2 py-2.5 text-sm transition-colors disabled:opacity-50",
              isSelected
                ? `${selectedTone} font-medium text-foreground`
                : "border-foreground/[0.08] bg-white text-foreground hover:bg-foreground/[0.02]",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", icon_colour)} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
