import supabase from "@/utils/supabase/client";
import { useEffect } from "react";

export function useRealTimeVisits(onNewVisit: (visit: any) => void) {
    useEffect(() => {
        const channel = supabase
            .channel("realtime-visits")
            .on("postgres_changes", {
                event: 'INSERT',
                schema: "pulic",
                table: "visits",
            },
                (payload) => {
                    if(payload.new.status === "awaiting_vitals") {
                        onNewVisit(payload.new);
                }
                })
            .subscribe()
        
        return () => {
            supabase.removeChannel(channel)
        };
    }, [onNewVisit])
}