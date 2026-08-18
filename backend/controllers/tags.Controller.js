import { supabase } from "../lib/supabase.js";

export const getTags = async (req, res) => {
    try {
        const { data, error } = await supabase.from("tags").select("name");
        if (error) throw error;
        return res.json({ tags: data });
    } catch (err) {
        console.error("[getTags] error", err);
        return res.status(500).json({ error: "server_error" });
    }
};

