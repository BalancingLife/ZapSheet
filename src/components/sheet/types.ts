export type Pos = { row: number; col: number };

export type Rect = {
  sr: number;
  sc: number;
  er: number;
  ec: number;
};

export type Dir = "up" | "down" | "left" | "right";

export type CellStyle = {
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  border?: CellBorder;

  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
};

export type BorderLineStyle = "solid" | "dashed" | "dotted";

export type BorderSpec = {
  color?: string;
  width?: number;
  style?: BorderLineStyle;
};

export type CellBorder = {
  top?: BorderSpec;
  right?: BorderSpec;
  bottom?: BorderSpec;
  left?: BorderSpec;
};

export type BorderApplyMode = "outline" | "all" | "inner";
