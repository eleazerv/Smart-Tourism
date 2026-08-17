import { rateLimit } from 'express-rate-limit'

const rateLimitResponse = (req,res) => { 
    return res.status(429).json({
        error: 'Too many requests, Please try it again later'
    })
}


export const globalLimiter = rateLimit ({
    windowMs: 60 * 1000, 
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitResponse
})

// kalo mo update / post 
export const moderateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,                  
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: rateLimitResponse,
});
 
// yang mahal ( gatau mo taro dimana masih lom kepikiran )
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,                  
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: rateLimitResponse,
});

