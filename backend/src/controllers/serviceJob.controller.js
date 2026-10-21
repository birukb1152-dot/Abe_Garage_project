import pool from "../config/db.js";

export const getServiceJobs = async(req,res)=>{
    try {
        const sql = `SELECT 
        sj.id,
        sj.vehicle_id,
        sj.job_description,
        sj.status,
        sj.start_date,
        sj.completion_date,
        sj.created_at,
        v.plate_number,
        v.make,
        v.model,
        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone
        
        FROM service_jobs sj
        INNER JOIN vehicles v ON sj.vehicle_id = v.id
        INNER JOIN customers c ON v.customer_id = c.id
        ORDER BY sj.id DESC`;

        const [rows] = await pool.execute(sql);

        return res.status(200).json({
            status:"ok",
            count:rows.length,
            serviceJobs:rows
        });

    } catch (error) {
        console.error("Failed to get service jobs", error);

        return res.status(500).json({
            status:"error",
            message:"Failed to get service jobs"
        })
    }
}