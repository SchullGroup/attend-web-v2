"use client";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

// Figma's vote control: a plain white bordered button per choice, with the icon carrying
// the colour (green For, red Against, grey Abstain) even at rest. The selected choice
// additionally fills with that same colour so it's unambiguous which one was picked.
// Shared by the Pre-AGM voting sheet and the live Resolution panel so both stay identical.
export const CHOICES: {
  value: VoteChoice;
  label: string;
  icon: typeof CheckCircle2;
  icon_colour: string;
  selected: string;
  selected_icon_colour: string;
}[] = [
  { value: "FOR", label: "For", icon: CheckCircle2, icon_colour: "text-emerald-600", selected: "border-emerald-600 bg-emerald-600 text-white", selected_icon_colour: "text-white" },
  { value: "AGAINST", label: "Against", icon: XCircle, icon_colour: "text-red-600", selected: "border-red-600 bg-red-600 text-white", selected_icon_colour: "text-white" },
  { value: "ABSTAIN", label: "Abstain", icon: MinusCircle, icon_colour: "text-gray-500", selected: "border-gray-400 bg-gray-200 text-gray-800", selected_icon_colour: "text-gray-600" },
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
      {CHOICES.map(({ value, label, icon: Icon, icon_colour, selected: selectedTone, selected_icon_colour }) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-[10px] border-2 px-2 py-2.5 text-sm transition-colors disabled:opacity-50",
              isSelected
                ? `${selectedTone} font-semibold`
                : "border-foreground/8 bg-white text-foreground hover:bg-foreground/2",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isSelected ? selected_icon_colour : icon_colour)} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
