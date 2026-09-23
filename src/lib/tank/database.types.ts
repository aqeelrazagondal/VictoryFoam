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
          reorder_kg: number | null;
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
          reorder_kg?: number | null;
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
          reorder_kg?: number | null;
          solid_content_pct?: number;
          unit?: string;
          updated_at?: string;
          viscosity?: number | null;
        };
        Relationships: [];
      };
      chemical_stock_movements: {
        Row: {
          balance_after: number;
          chemical_id: string;
          created_at: string;
          id: string;
          note: string | null;
          quantity: number;
          tank_log_entry_id: string | null;
          type: "receive" | "issue" | "waste" | "count" | "pour";
        };
        Insert: {
          balance_after: number;
          chemical_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          quantity: number;
          tank_log_entry_id?: string | null;
          type: "receive" | "issue" | "waste" | "count" | "pour";
        };
        Update: {
          balance_after?: number;
          chemical_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          quantity?: number;
          tank_log_entry_id?: string | null;
          type?: "receive" | "issue" | "waste" | "count" | "pour";
        };
        Relationships: [
          {
            foreignKeyName: "chemical_stock_movements_chemical_id_fkey";
            columns: ["chemical_id"];
            isOneToOne: false;
            referencedRelation: "chemicals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chemical_stock_movements_tank_log_entry_id_fkey";
            columns: ["tank_log_entry_id"];
            isOneToOne: false;
            referencedRelation: "tank_log_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      last_calculation: {
        Row: {
          calculator: string;
          payload: Json;
          tank_id: string;
          updated_at: string;
        };
        Insert: {
          calculator: string;
          payload?: Json;
          tank_id: string;
          updated_at?: string;
        };
        Update: {
          calculator?: string;
          payload?: Json;
          tank_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "last_calculation_tank_id_fkey";
            columns: ["tank_id"];
            isOneToOne: false;
            referencedRelation: "tanks";
            referencedColumns: ["id"];
          },
        ];
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
          tank_id: string;
          type: "opening_balance" | "add_batch" | "consume_usage" | "adjust_composition";
        };
        Insert: {
          chemical_id?: string | null;
          created_at?: string;
          entry_date?: string;
          id?: string;
          note?: string | null;
          quantity: number;
          solid_content_pct?: number | null;
          tank_id: string;
          type: "opening_balance" | "add_batch" | "consume_usage" | "adjust_composition";
        };
        Update: {
          chemical_id?: string | null;
          created_at?: string;
          entry_date?: string;
          id?: string;
          note?: string | null;
          quantity?: number;
          solid_content_pct?: number | null;
          tank_id?: string;
          type?: "opening_balance" | "add_batch" | "consume_usage" | "adjust_composition";
        };
        Relationships: [
          {
            foreignKeyName: "tank_log_entries_chemical_id_fkey";
            columns: ["chemical_id"];
            isOneToOne: false;
            referencedRelation: "chemicals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tank_log_entries_tank_id_fkey";
            columns: ["tank_id"];
            isOneToOne: false;
            referencedRelation: "tanks";
            referencedColumns: ["id"];
          },
        ];
      };
      tanks: {
        Row: {
          archived_at: string | null;
          capacity: number | null;
          created_at: string;
          heel: number;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          capacity?: number | null;
          created_at?: string;
          heel?: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          capacity?: number | null;
          created_at?: string;
          heel?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_stock_movement: {
        Args: {
          p_chemical_id: string;
          p_note?: string | null;
          p_quantity: number;
          p_tank_log_entry_id?: string | null;
          p_type: string;
        };
        Returns: Json;
      };
      reverse_stock_for_log_entry: {
        Args: {
          p_entry_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
