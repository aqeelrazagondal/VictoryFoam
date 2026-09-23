export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      chemicals: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          oh_value: number | null;
          qty_available: number | null;
          solid_content_pct: number;
          unit: string;
          updated_at: string;
          viscosity: number | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          oh_value?: number | null;
          qty_available?: number | null;
          solid_content_pct: number;
          unit?: string;
          updated_at?: string;
          viscosity?: number | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          oh_value?: number | null;
          qty_available?: number | null;
          solid_content_pct?: number;
          unit?: string;
          updated_at?: string;
          viscosity?: number | null;
        };
        Relationships: [];
      };
      last_calculation: {
        Row: {
          calculator: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          calculator: string;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          calculator?: string;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      tank_log_entries: {
        Row: {
          chemical_id: string | null;
          created_at: string;
          entry_date: string;
          id: string;
          note: string | null;
          quantity: number;
          solid_content_pct: number | null;
          type: "opening_balance" | "add_batch" | "consume_usage";
        };
        Insert: {
          chemical_id?: string | null;
          created_at?: string;
          entry_date?: string;
          id?: string;
          note?: string | null;
          quantity: number;
          solid_content_pct?: number | null;
          type: "opening_balance" | "add_batch" | "consume_usage";
        };
        Update: {
          chemical_id?: string | null;
          created_at?: string;
          entry_date?: string;
          id?: string;
          note?: string | null;
          quantity?: number;
          solid_content_pct?: number | null;
          type?: "opening_balance" | "add_batch" | "consume_usage";
        };
        Relationships: [
          {
            foreignKeyName: "tank_log_entries_chemical_id_fkey";
            columns: ["chemical_id"];
            isOneToOne: false;
            referencedRelation: "chemicals";
            referencedColumns: ["id"];
          },
        ];
      };
      tank_settings: {
        Row: {
          capacity: number | null;
          heel: number;
          id: boolean;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          heel?: number;
          id?: boolean;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          heel?: number;
          id?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
