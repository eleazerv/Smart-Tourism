const recentViews = new Map(); 
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000

export function dedupView (req,res,next) { 
    const destinationId = req.params.id 
    const identifier = req.user?.id || req.ip; 
    const key = `${destinationId}:${identifier}` ; 
    const lastViewed = recentViews.get(key); 
    const now = Date.now(); 

    if (lastViewed && now - lastViewed < DEDUPE_WINDOW_MS) { 
        req.skipViewTracking = true ; 
    }else { 
        recentViews.set(key, now)
    }
    next();
}

setInterval(() => { 
    const now = Date.now(); 
    for ( const [key,timestamp] of recentViews.entries()) { 
        if ( now - timestamp > DEDUPE_WINDOW_MS) { 
            recentViews.delete(key); 
        }
    }
},60*60*1000); 

