import { getUserClient, supabase } from "../lib/supabase.js";

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
        req.accessToken = token; 
        req.db = getUserClient(token); 
        next();
    } catch (error) {
        console.error('[Auth Middleware] error', error)
        return res.status(500).json({ error: 'Auth Error' });
    }
}

export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
 
        if (!authHeader) {
            req.user = null;
            return next();
        }
 
        const token = authHeader.split(' ')[1];
 
        if (!token) {
            req.user = null;
            return next();
        }
 
        const { data, error } = await supabase.auth.getUser(token);
 
        if (error || !data.user) {
            req.user = null;
            return next();
        }
 
        req.user = data.user;
        req.accessToken = token;
        next();
    } catch (error) {
        console.error('[Optional Auth Middleware] error', error);
        // tetap lanjut sebagai guest, jangan block route publik gara-gara error auth
        req.user = null;
        next();
    }
};
