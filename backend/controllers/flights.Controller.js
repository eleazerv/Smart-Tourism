import { supabase } from "../lib/supabase.js";

const FLIGHT_FIELDS = `
    id, origin_city_id, destination_city_id, airline, flight_number,
    departure_time, arrival_time, price, available_seats, currency
`;
 
const FLIGHT_DETAIL_FIELDS = `
    id, airline, flight_number, departure_time, arrival_time,
    price, available_seats, currency,
    origin:origin_city_id ( id, name, provinces ( id, code, name ) ),
    destination:destination_city_id ( id, name, provinces ( id, code, name ) )
`;

const pad = (n) => String(n).padStart(2, '0');
 


// ambe hari terakhir
function getDaysInMonth(year,month){ 
    return new Date(year,month,0).getDate(); 
}

// GET /api/flights/calendar?origin_city_id=&destination_city_id=&month=YYYY-MM
export const getFlightsCalendar = async (req,res) => { 
    try {
        const { origin_city_id , destination_city_id, month } = req.query;
        if (!origin_city_id || !destination_city_id ) {
            return res.status(400).json({
                error: 'invalid_query',
                message: 'origin_city_id and destination_city_id are required',
            });
        }

        const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
        const targetMonth = month || new Date().toISOString().slice(0,7); 

        if(!monthPattern.test(targetMonth)) {
            return res.status(400).json({
                error: 'invalid_month',
                message: 'month must be in YYYY-MM format',
            });
        }

        const [yearStr, monthStr] = targetMonth.split('-');
        const year = Number(yearStr);
        const monthNum = Number(monthStr);
        const daysInMonth = getDaysInMonth(year,monthNum);

        const rangeStartofMonth= `${targetMonth}-01T00:00:00`
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const rangeStart = rangeStartofMonth > nowStr ? rangeStartofMonth : nowStr;

        const nextMonthDate = new Date(year, monthNum, 1);
        const nextYear = nextMonthDate.getFullYear();
        const nextMonthNum = nextMonthDate.getMonth() + 1; 
        const rangeEnd = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-01T00:00:00`;

         const {data,error} = await supabase.from('flight_options')
                                            .select('departure_time,price')
                                            .eq('origin_city_id',origin_city_id)
                                            .eq('destination_city_id',destination_city_id)
                                            .gt('available_seats',0)
                                            .gte('departure_time',rangeStart)
                                            .lt('departure_time',rangeEnd)
        if (error) throw error; 
        const lowestByDate = {}; 
        for (const row of data) { 
            const dateKey = row.departure_time.slice(0,10); //YYYY-MM-DD
            if(!(dateKey in lowestByDate) || row.price < lowestByDate[dateKey]) {
                lowestByDate[dateKey] = row.price
            }
        }    
        
        const calendar = [] ; 

        for (let day = 1 ; day <= daysInMonth ; day++) { 
            const dateKey =  `${targetMonth}-${String(day).padStart(2,'0')}`;
            calendar.push({
                date: dateKey,
                price: lowestByDate[dateKey] || null,
            })
        }

        return res.json({
            origin_city_id: Number(origin_city_id),
            destination_city_id: Number(destination_city_id),
            month: targetMonth,
            data: calendar,
        });
                                            
    } catch (err) {
        console.error('[getFlightsCalendar] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
}

// GET /api/flights?origin_city_id=&destination_city_id=&date=YYYY-MM-DD&sort=price|departure_time
export const getFlightsByDate = async (req, res) => {
    try {
        const { origin_city_id, destination_city_id, date, sort = 'price' } = req.query;
 
        if (!origin_city_id || !destination_city_id || !date) {
            return res.status(400).json({
                error: 'invalid_query',
                message: 'origin_city_id, destination_city_id, and date are required'
            });
        }
 
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(date)) {
            return res.status(400).json({
                error: 'invalid_date',
                message: 'date must be in YYYY-MM-DD format'
            });
        }
 
        if (!['price', 'departure_time'].includes(sort)) {
            return res.status(400).json({
                error: 'invalid_sort',
                message: 'sort must be price or departure_time'
            });
        }
 
        const rangeStart = `${date}T00:00:00`;
        const rangeEnd = `${date}T23:59:59`;
 
        const { data, error } = await supabase
            .from('flight_options')
            .select(FLIGHT_FIELDS)
            .eq('origin_city_id', origin_city_id)
            .eq('destination_city_id', destination_city_id)
            .gte('departure_time', rangeStart)
            .lte('departure_time', rangeEnd)
            .order(sort, { ascending: true });
 
        if (error) throw error;
        if (!data || data.length===0) { 
            return res.status(404).json({
                error: 'not_found',
                message: 'Flights not found'
            });
        }
 
        return res.json({
            origin_city_id: Number(origin_city_id),
            destination_city_id: Number(destination_city_id),
            date,
            data,
        });
    } catch (err) {
        console.error('[getFlightsByDate] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
 
// GET /api/flights/:id 
export const getFlightById = async (req, res) => {
    try {
        const flightId = req.params.id;
 
        const { data, error } = await supabase
            .from('flight_options')
            .select(FLIGHT_DETAIL_FIELDS)
            .eq('id', flightId)
            .maybeSingle();
 
        if (error) throw error;
 
        if (!data) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Flight not found'
            });
        }
 
        return res.json({ data });
    } catch (err) {
        console.error('[getFlightById] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
 