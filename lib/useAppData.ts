"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export interface PaymentMethod {
  id: string;
  tipo: string;
  banco: string | null;
}

export interface AppData {
  loading: boolean;
  userId: string | null;
  coupleId: string | null;
  cycleId: string | null;
  paymentMethods: PaymentMethod[];
}

const EMPTY: AppData = {
  loading: true,
  userId: null,
  coupleId: null,
  cycleId: null,
  paymentMethods: [],
};

/** Contexto compartido (usuario, couple, ciclo abierto, medios de pago) para
 * las pantallas de uso diario — evita repetir las mismas 3 queries en cada una. */
export function useAppData(): AppData {
  const [data, setData] = useState<AppData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [coupleRes, methodsRes] = await Promise.all([
        supabase
          .from("couples")
          .select("id, current_cycle_id")
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .maybeSingle(),
        supabase.from("payment_methods").select("id, tipo, banco").eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setData({
        loading: false,
        userId: user.id,
        coupleId: coupleRes.data?.id ?? null,
        cycleId: coupleRes.data?.current_cycle_id ?? null,
        paymentMethods: methodsRes.data ?? [],
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
