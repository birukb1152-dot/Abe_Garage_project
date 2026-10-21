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

export const getServiceJob = async(req,res)=>{
    try {
        const id = Number(req.params.id);

        if(!Number.isSafeInteger(id) || id <= 0){
            return res.status(400).json({
                status:"error",
                message:"Invalid service job ID"
            })
        };

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
        WHERE sj.id = ?`;
        
        const [rows] = await pool.execute(sql,[id]);

        if(rows.length === 0){
            return res.status(404).json({
                status:"error",
                message:"Service job not found"
            })
        };

        res.status(200).json({
            status:"ok",
            serviceJob:rows[0]
        })
    } catch (error) {
        console.error("Failed to get service job",error);

        return res.status(500).json({
            status:"error",
            message:"Failed to get service job"
        })
    }
}