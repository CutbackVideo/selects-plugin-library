import type { ReactNode } from "react";

export type KitIcon = "check" | "loading" | "error" | "close" | "info" | "clock" | "warning" | "refresh" | "play" | "settings";

export type Kit = {
  version?: number;
  Section(props: { title: string; actions?: ReactNode; children?: ReactNode }): ReactNode;
  Stack(props: { gap?: 4 | 8 | 16; children?: ReactNode }): ReactNode;
  Row(props: { gap?: 4 | 8; align?: "start" | "center" | "end"; children?: ReactNode }): ReactNode;
  Actions(props: { children?: ReactNode }): ReactNode;
  Segmented<T extends string>(props: { label: string; value: T; onChange(value: T): void; options: { value: T; label: string }[]; disabled?: boolean }): ReactNode;
  Toggle(props: { label: string; value: boolean; onChange(value: boolean): void; disabled?: boolean }): ReactNode;
  Button(props: { variant?: "primary" | "secondary" | "ghost" | "danger"; busy?: boolean; busyLabel?: string; disabled?: boolean; onClick(): void; children?: ReactNode }): ReactNode;
  Icon(props: { name: KitIcon; size?: 12 | 14 | 16 }): ReactNode;
  Message(props: { tone?: "muted" | "error" | "success"; children?: ReactNode }): ReactNode;
};
