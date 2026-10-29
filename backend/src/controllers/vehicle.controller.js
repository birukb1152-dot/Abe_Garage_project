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

    FROM vehicles v
    INNER JOIN customers c ON v.customer_id = c.id
    ORDER BY v.id ASC
    `;

    const [rows] = await pool.execute(sql);

    res.status(200).json({
        status:"ok",
        count:rows.length,
        vehicles:rows
    })
    }
    catch(error){
        console.error("Failed to fetch vehicles",error.message);

        res.status(500).json({
            status:"error",
            message:"Failed to fetch vehicles"
        })

    }
}

//get vehicles by id
export const getVehicleById = async(req,res)=>{
    const id = Number(req.params.id);

    if (!/^[1-9]\d*$/.test(req.params.id) ||
        !Number.isSafeInteger(id)) {
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
        vechile:rows[0]
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

    if(typeof plate_number !== "string" || 
        !plate_number.trim() ||
        typeof make !== "string" || 
        !make.trim() ||
        typeof model !== "string" || 
        !model.trim()||
        typeof type !== "string" || 
        !type.trim()  
    ){
    return res.status(400).json({
        status:"error",
        message:"plate number , make , model , year are required"
    })
    }

    if(year !== undefined && 
        year !== null && 
        (!Number.isSafeInteger(year) || year <1886 || year > 2100) ){
        return res.status(400).json({
          status: "error",
          message: "Vehicle year must be an integer between 1886 and 2100",
        });
    }

    if( mileage !== undefined && 
        mileage !== null && 
        (!Number.isSafeInteger(mileage) || mileage < 0)){
        return res.status(400).json({
          status: "error",
          message: "Mileage must be a non-negative integer",
        });
    }

    for (const [field, value, maxLength] of [
      ["tag", tag, 50],
      ["serial", serial, 100],
      ["color", color, 30],
    ]) {
      if (value !== undefined && value !== null) {
        if (typeof value !== "string") {
          return res.status(400).json({
            status: "error",
            message: `${field} must be a string`,
          });
        }

        if (value.trim().length > maxLength) {
          return res.status(400).json({
            status: "error",
            message: `${field} must be at most ${maxLength} characters`,
          });
        }
      }
    }

    if (
      plate_number.trim().length > 20 ||
      make.trim().length > 50 ||
      model.trim().length > 50 ||
      type.trim().length > 30
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Plate number must be at most 20 characters, make and model at most 50 characters, and type at most 30 characters",
      });
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

//update vehicle
export const updateVehicle = async(req,res)=>{
    const id = Number(req.params.id);

    if(!/^[1-9]\d*$/.test(req.params.id)||
        !Number.isSafeInteger(id)){
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

    if (
      !Number.isSafeInteger(customer_id) ||
      customer_id <= 0 ||
      typeof plate_number !== "string" ||
      !plate_number.trim() ||
      typeof make !== "string" ||
      !make.trim() ||
      typeof model !== "string" ||
      !model.trim() ||
      typeof type !== "string" ||
      !type.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "customer id, plate number , make , model and type are required",
      });
    }

    if (
      year !== undefined &&
      year !== null &&
      (!Number.isSafeInteger(year) || year < 1886 || year > 2100)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vehicle year must be an integer between 1886 and 2100",
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

    
for (const [field, value, maxLength] of [
  ["tag", tag, 50],
  ["serial", serial, 100],
  ["color", color, 30],
]) {
  if (value !== undefined && value !== null) {
    if (typeof value !== "string") {
      return res.status(400).json({
        status: "error",
        message: `${field} must be a string`,
      });
    }

    if (value.trim().length > maxLength) {
      return res.status(400).json({
        status: "error",
        message: `${field} must be at most ${maxLength} characters`,
      });
    }
  }
}



if (
  plate_number.trim().length > 20 ||
  make.trim().length > 50 ||
  model.trim().length > 50 ||
  type.trim().length > 30
) {
  return res.status(400).json({
    status: "error",
    message:
      "Plate number must be at most 20 characters, make and model at most 50 characters, and type at most 30 characters",
  });
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

        const [result] = await pool.execute(sql,values);

        return res.status(200).json({
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
              status: "error",
              message: "A vehicle with this plate number already exists",
            });
        }

        console.error("Failed to update vehicles",error);

        return res.status(500).json({
            status:'error',
            message:"Failed to update vehicles"
        })
    }
}

//delete vehilcle
export const deleteVehicle =async(req,res)=>{
    try {
      const id = Number(req.params.id);

      if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid vehicle ID",
        });
      }

      const [rows] = await pool.execute(
        `SELECT id FROM vehicles WHERE id = ?`,
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Vehicle not found",
        });
      }

      await pool.execute(`DELETE FROM vehicles WHERE id = ?`, [id]);

      return res.status(200).json({
        status: "ok",
        message: "Vehicle successfully deleted",
      });
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          status: "error",
          message:
            "Cannot delete this vehicle because related service jobs exist. Remove or reassign the related service jobs first.",
        });
      }

      console.error("Failed to delete vehicle:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to delete vehicle",
      });
    }
}