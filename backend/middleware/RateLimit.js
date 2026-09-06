import { rateLimit, ipKeyGenerator } from 'express-rate-limit'

const rateLimitResponse = (req,res) => { 
    return res.status(429).json({
        error: 'Too many requests, Please try it again later'
    })
}


export const globalLimiter = rateLimit ({
    windowMs: 60 * 1000, 
    max: 300,
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
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: rateLimitResponse,
});
 
// yang mahal ( gatau mo taro dimana masih lom kepikiran )
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,                  
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: rateLimitResponse,
});


export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,                  
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: rateLimitResponse,
})

export const chatDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 jam
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Batas 200 pesan per hari sudah tercapai. Coba lagi besok.'
    })
  },
})