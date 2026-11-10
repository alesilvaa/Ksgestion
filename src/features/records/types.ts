export type RecordGroup = "transfer" | "payment";

export type MovementType = {
  id: string;
  name: string;
  code: string;
  color: string;
  position: number;
};

export type RecordMutation = {
  date: string | null;
  description: string;
  movementTypeId: string;
  amount: number;
  category?: string;
  notes?: string;
  reference?: string;
  method?: string;
};

export type RecordItem = {
  id: string;
  date: string | null;
  sourceSheet?: string | null;
  description: string;
  group: RecordGroup;
  movementTypeId: string;
  movementTypeCode: string;
  movementTypeName: string;
  movementTypeColor: string;
  amount: number;
  sourceYear?: number | null;
  category?: string;
  notes?: string;
  reference?: string;
  method?: string;
};
