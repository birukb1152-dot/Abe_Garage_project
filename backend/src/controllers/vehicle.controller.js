import pool from "../config/db.js";

//get all vehiles
export const getVehicles =async(req,res)=>{
    try{
    const sql = `SELECT 
    v.id,
    v.customer_id,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    c.phone AS customer_phone,
    v.plate_number,
    v.year,
    v.make,
    v.model,
    v.type,
    v.mileage,
    v.tag,
    v.serial,
    v.color,
    v.created_at

    FROM vehicles v INNER JOIN customers c ON v.customer_id = c.id
    `;

    const [rows] = await pool.execute(sql);

    res.status(200).json({
        status:"ok",
        count:rows.length,
        vechiles:rows
    })
    }
    catch(error){
        console.error("Failed to get vehicles",error);

        res.status(500).json({
            status:"error",
            message:"Failed to get vehiles"
        })

    }
}

//get vehicles by id
export const getVehicleById = async(req,res)=>{
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({
        status: "error",
        message: "Invalid vehicle ID",
      });
    }

    try {
    const sql = `SELECT 
    v.id,
    v.customer_id,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    c.phone AS customer_phone,
    v.plate_number,
    v.year,
    v.make,
    v.model,
    v.type,
    v.mileage,
    v.tag,
    v.serial,
    v.color,
    v.created_at

    FROM vehicles v INNER JOIN customers c ON v.customer_id = c.id
    WHERE v.id = ?
    `;

    const [rows] = await pool.execute(sql,[id]);

    if(rows.length === 0){
        return res.status(404).json({
            status:"error",
            message:"Vehicle not found"
        })
    }

    return res.status(200).json({
        status:"ok",
        vechiles:rows[0]
    })

    } catch (error) {
       console.error("Failed to get vehicles",error);
       
       res.status(500).json({
        status:"error",
        message:"Failed to get vehicle"
       })
    }
}