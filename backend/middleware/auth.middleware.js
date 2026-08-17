import { supabase } from "../lib/supabase";

export const authMiddleware = async(req,res,next)=> { 
    try {
        const authHeader = req.headers.authorization; 
        if (!authHeader) {
            return res.status(401).json({ 
                error:"unauthorized",
                message: "Missing Authorization header" });   
        }
        const token = authHeader.split(' ')[1]; 
        const {data, error} = await supabase.auth.getUser(token);

        if (error || !data.user) { 
            return res.status(401).json({
                error:'unauthorized',
                message:'Invalid Token'
            })
        }
        req.user = data.user;
        req.accessToken = token
        next();
    } catch (error) {
        console.error('[Auth Middleware] error', error)
        return res.status(500).json({ error: 'Auth Error' });
    }
}