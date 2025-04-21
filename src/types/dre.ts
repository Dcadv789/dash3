export type DreTemplate = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DreSection = {
  id: string;
  company_id: string;
  template_id: string | null;
  name: string;
  code: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DreLineType = 'header' | 'category' | 'calculation' | 'indicator' | 'subtotal' | 'total';

export type DreLine = {
  id: string;
  section_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  type: DreLineType;
  display_order: number;
  category_ids: string[] | null;
  indicator_id: string | null;
  formula: string | null;
  indent_level: number;
  show_percentage: boolean;
  highlight_color: string | null;
  is_bold: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DreDisplaySettings = {
  id: string;
  company_id: string;
  show_codes: boolean;
  show_zero_lines: boolean;
  percentage_precision: number;
  value_precision: number;
  negative_color: string;
  positive_color: string;
  created_at: string;
  updated_at: string;
};