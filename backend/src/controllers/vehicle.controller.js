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

//create (post) vehicles
export const createVehiles = async(req,res)=>{
    const {
        customer_id,
        plate_number,
        year,
        make,
        model,
        type,
        mileage,
        tag,
        serial,
        color
    } = req.body;

    if(!Number.isSafeInteger(customer_id) || customer_id <= 0){
        return res.status(400).json({
            status:"error",
            message:"Invalid customer ID"
        })
    }

    if(typeof plate_number !== "string" || !plate_number.trim(),
        typeof make !== "string" || !make.trim(),
        typeof model !== "string" || !model.trim(),
        typeof type !== "string" || !type.trim()  
    ){
    return res.status(400).json({
        status:"error",
        message:"plate number , make , model , year are required"
    })
    }

    if(year !== undefined && year !== null && (!Number.isSafeInteger(year) || year <1886 || year > 2100) ){
        return res.status(400).json({
            status:"error",
            message:"Vehicle year must be validate"
        })
    }

    if( mileage !== undefined && mileage !== null && (!Number.isSafeInteger(mileage) || mileage < 0)){
        return res.status(400).json({
            status:"error",
            message:"Mileage must be > 0 or not negative"
        })
    }

    for(const [filed, value, maxLength] of [
        ["tags",tag,50],
        ["serial",serial,100],
        ["color",color,30],
    ]){
        if(value !== undefined && value !== null && value.length > maxLength){
            return res.status(400).json({
                status:"error",
                message:`${filed} must be text of at most ${maxLength} characters`,
            })
        }
    }

    try {
        const [customers] = await pool.execute(`SELECT id FROM customers WHERE id = ?`,[customer_id]);

        if(customers.length === 0){
            return res.status(404).json({
                status:"error",
                message:"Customer not found"
            })
        }

        const sql = `
        INSERT INTO vehicles(
        customer_id,
        plate_number,
        year,
        make,
        model,
        type,
        mileage,
        tag,
        serial,
        color
        )
         VALUE(?,?,?,?,?,?,?,?,?,?)
        `;

        const values = [
            customer_id,
            plate_number.trim(),
            year ?? null,
            make.trim(),
            model.trim(),
            type.trim(),
            mileage ?? null,
            tag?.trim() || null,
            serial?.trim() || null,
            color?.trim() || null
        ];

        const [result] = await pool.execute(sql,values);

        return res.status(201).json({
            status:"ok",
            vehicle:{
                id:result.insertId,
                customer_id,
                plate_number:plate_number.trim(),
                year:year ?? null,
                make:make.trim(),
                model:model.trim(),
                type:type.trim(),
                mileage:mileage ?? null,
                tag:tag?.trim() || null,
                serial:serial?.trim() || null,
                color:color?.trim() || null
            }
        })

    } catch (error) {
        if(error.code === "ER_DUP_ENTRY"){
            return res.status(409).json({
                status:"error",
                message:"Vehicle with this plate is already exists"
            })
        }

        console.error("Failed to create vehicles",error);

        return res.status(500).json({
            status:'error',
            message:"Failed to create vehicles"
        })
    }
}

//update vehicles
export const updateVehicle = async(req,res)=>{
    const id = Number(req.params.id);

    if(!Number.isSafeInteger(id) || id<=0){
        return res.status(400).json({
            status:"error",
            message:"Invalid vehicle ID"
        })
    }

    const {
        customer_id,
        plate_number,
        year,
        make,
        model,
        type,
        mileage,
        tag,
        serial,
        color
    } = req.body;

    if(!Number.isSafeInteger(customer_id) || customer_id <= 0,
        typeof plate_number !== "string" || !plate_number.trim(),
        typeof make !== "string" || !make.trim(),
        typeof model !== "string" || !model.trim(),
        typeof type !== "string" || !type.trim()){

        return res.status(400).json({
            status:"error",
            message:"customer id, plate number , make , model and type are required"
        })
    }

    if (
      year !== undefined &&
      year !== null &&
      (!Number.isSafeInteger(year) || year < 1886 || year > 2100)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vehicle year must be validate",
      });
    }

    if (
      mileage !== undefined &&
      mileage !== null &&
      (!Number.isSafeInteger(mileage) || mileage < 0)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Mileage must be a non-negative whole number",
      });
    }

    for (const [filed, value, maxLength] of [
      ["tags", tag, 50],
      ["serial", serial, 100],
      ["color", color, 30],
    ]) {
      if (value !== undefined && value !== null && value.length > maxLength) {
        return res.status(400).json({
          status: "error",
          message: `${filed} must be text of at most ${maxLength} characters`,
        });
      }
    }

    try {
        const [vehicles] = await pool.execute(`SELECT id FROM vehicles WHERE id = ?`,[id]);

        if(vehicles.length === 0){
            return res.status(404).json({
                status:"error",
                message:"Vehicle not found"
            })
        }

        const [customers] = await pool.execute(`SELECT id FROM customers WHERE id = ?`,[customer_id]);

        if(customers.length === 0){
            return res.status(404).json({
                status:"error",
                message:"Customer not found"
            })
        }

        const sql = `UPDATE vehicles SET 
                    customer_id = ?,
                    plate_number = ?,
                    year = ?,
                    make = ?,
                    model = ?,
                    type = ?,
                    mileage = ?,
                    tag = ?,
                    serial = ?,
                    color = ?
                    WHERE id = ?`;

        const values = [
            customer_id,
            plate_number.trim(),
            year ?? null,
            make.trim(),
            model.trim(),
            type.trim(),
            mileage ?? null,
            tag?.trim() || null,
            serial?.trim() || null,
            color?.trim() || null,
            id
        ];

        await pool.execute(sql,values);

        return res.status(201).json({
          status: "ok",
          vehicle: {
            id,
            customer_id,
            plate_number: plate_number.trim(),
            year: year ?? null,
            make: make.trim(),
            model: model.trim(),
            type: type.trim(),
            mileage: mileage ?? null,
            tag: tag?.trim() || null,
            serial: serial?.trim() || null,
            color: color?.trim() || null,
          },
        });
    } catch (error) {
        if(error.code === "ER_DUP_ENTRY"){
            return res.status(409).json({
                status:"error",
                message:"Vehicle with this plate is already exists"
            })
        }

        console.error("Failed to create vehicles",error);

        return res.status(500).json({
            status:'error',
            message:"Failed to create vehicles"
        })
    }
}