import pool from "../config/db.js";

//get service jobs
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


//get one service job
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

//create (post) service jobs
export const createServiceJob = async(req,res)=>{
    try {
        const {
            vehicle_id,
            job_description,
            status,
            start_date
        } = req.body;

        const vehicleId = Number(vehicle_id);

        if(vehicle_id === undefined ||
            vehicle_id === null ||
            !Number.isSafeInteger(Number(vehicleId)) ||
            vehicleId <= 0
        ){
            return res.status(400).json({
              status: "error",
              message: "Valid vehicle ID requied",
            });
        }

        if(typeof job_description != "string" ||
             job_description.trim() === ""
        ){
            return res.status(400).json({
                status:"error",
                message:"Job description requied"
            })
        }

        if (start_date !== undefined && start_date !== null) {
          if (
            typeof start_date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(start_date)
          ) {
            return res.status(400).json({
              status: "error",
              message: "Start date must use YYYY-MM-DD format",
            });
          }

          const date = new Date(`${start_date}T00:00:00Z`);

          if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== start_date
          ) {
            return res.status(400).json({
              status: "error",
              message: "Invalid start date",
            });
          }
        }

        const allowedStatuses = [
            "pending",
            "in_progress",
            "completed",
            "cancelled"
        ];

        const jobStatus = status ?? "pending"

        if(!allowedStatuses.includes(jobStatus)){
            return res.status(400).json({
                status:"error",
                message:"Invalid job status"
            })
        }

        const [vehicles] = await pool.execute(`
            SELECT id FROM vehicles WHERE id = ?`,
            [Number(vehicle_id)]);

        if(vehicles.length === 0){
            return res.status(404).json({
                status:"error",
                message:"Vehicle not found"
            })
        }

        const sql = `
        INSERT INTO service_jobs(vehicle_id, job_description, status ,start_date)
        VALUE (? , ? , ? , ?)
        `;

        const [result] = await pool.execute(
            sql,
            [
                Number(vehicle_id),
                job_description.trim(),
                jobStatus,
                start_date ?? null
            ]
        );

        return res.status(201).json({
            status:"ok",
            message:"Job successfully create",
            serviceJob:{
                id:result.insertId,
                vehicle_id:Number(vehicle_id),
                job_description:job_description.trim(),
                status:jobStatus,
                start_date:start_date ?? null
            }
        })

    } catch (error) {
        console.error("Failed to create service job",error);

        return res.status(500).json({
          status: "error",
          message: "Failed to create service job"
        });
    }
}