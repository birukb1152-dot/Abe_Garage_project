import express, { json } from 'express'
import cors from 'cors'
import pool from './config/db.js'
import customerRoutes from './routes/customer.routes.js'
import vechileRoutes from './routes/vehicle.routes.js'
import serviceJobRoutes from './routes/serviceJob.routes.js'
import errorHandler from './middleware/error.middleware.js'
import notFoundHandler from './middleware/notFound.middleware.js'
import authRoutes from "../src/routes/auth.routes.js"
import userRoutes from "../src/routes/user.routes.js"

const app = express();

app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
    res.send("Hello from abe garage");
});


app.get('/api/health',async(req,res)=>{
    try {
        const [rows] = await pool.execute(`SELECT 
            VERSION() AS server_version,
            DATABASE() AS database_name,
            1 AS test_value
            `);

            res.status(200).json({
                status:"ok",
                database:"connected",
                server:rows[0].server_version,
                database:rows[0].database_name,
                testValue:rows[0].test_value
            });

    } catch (error) {
        console.error("Database health check failed",error);

        res.status(500).json({
            status:"error",
            database:'disconnected',
            message:"Database health check failed"
        })
    }
})

app.use("/api/auth",authRoutes);
app.use("/api/customers",customerRoutes);
app.use("/api/vehicles",vechileRoutes);
app.use("/api/service-jobs",serviceJobRoutes);
app.use("/api/users",userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);


export default app;