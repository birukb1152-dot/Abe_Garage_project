import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";


dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

app.get("/api/customers", async (req, res) => {
  try {
    const sql = `SELECT id, first_name, last_name, phone FROM customers ORDER BY id`;
    
    const [rows] = await pool.query(sql);
    res.status(200).json({
      status:"ok",
      count:rows.length,
      customers:rows
    })

  } catch (error) {
    console.error("Unexpected error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Unexpected error occurred"
    });
  }
});

app.post("/api/customers",async (req,res)=>{

  const {first_name, last_name, phone} = req.body;

  if(
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof phone !== "string"||
    !first_name.trim() ||
    !last_name.trim() ||
    !phone.trim()
  ){
    return res.status(400).json({
      status:"error",
      message:"First name , last name and phone are required",
    });
  }

  try{
     const sql =
       `INSERT INTO customers (first_name, last_name, phone) VALUES (?,?,?)`;

    const values = [
      first_name.trim(),
      last_name.trim(),
      phone.trim()
    ];

    const [result] = await pool.execute(sql, values);

    res.status(201).json(
      {
        status:"ok",
        message: "customers created successfully",
        customerId: {
          id: result.insertId,
          first_name:first_name.trim(),
          last_name:last_name.trim(),
          phone:phone.trim()
        },
      });

  }catch(error){
    console.error("Failed to create customers:",error.message);

    res.status(500).json({
      status:"error",
      message:"Failed to create customers",
    });
  }
});


app.put("/api/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { first_name, last_name, phone } = req.body;

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid customer ID",
    });
  }

  if (
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof phone !== "string" ||
    !first_name.trim() ||
    !last_name.trim() ||
    !phone.trim()
  ) {
    return res.status(400).json({
      status: "error",
      message: "First name, last name and phone are required",
    });
  }

  try {
    const sql = `
      UPDATE customers
      SET first_name = ?, last_name = ?, phone = ?
      WHERE id = ?
    `;

    const values = [first_name.trim(), last_name.trim(), phone.trim(), id];

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      const [rows] = await pool.execute(
        "SELECT id FROM customers WHERE id = ?",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Customer not found",
        });
      }
    }

    res.status(200).json({
      status: "ok",
      message: "Customer updated successfully",
      customer: {
        id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
      },
    });
  } catch (error) {
    console.error("Failed to update customer:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to update customer",
    });
  }
});


app.delete("/api/customers/:id",async (req,res)=>{

  const id = Number(req.params.id);

  if(!Number.isSafeInteger(id) || id <= 0){
    return res.status(400).json({
      status:"error",
      message:"Invalid customer ID",
    })
  }

  try{
    const [result] = await pool.execute("DELETE FROM customers WHERE id=?",[id]);

    if(result.affectedRows === 0){
      return res.status(404).json({
      status:"error",
      message:"customer not found"
      })    
    }

    res.status(200).json({
      status:"ok",
      message:"Customer successfully deleted",
      customerId:id
    })

  }catch(err){
    console.error("Failed to delete customer",err);

    res.status(500).json({
      status:"error",
      message:"Failed to delete customer"
    })
  }
  
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
