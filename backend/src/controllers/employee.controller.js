import pool from "../config/db.js";

// Admin creates an employee linked to an existing user account
export const createEmployee = async (req, res, next) => {
  try {
    const { user_id, phone, position, salary, hire_date } = req.body;

    // Validate user ID
    const userId = Number(user_id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid user_id is required",
      });
    }

    // Validate position
    if (
      typeof position !== "string" ||
      !position.trim() ||
      position.trim().length > 100
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid position is required (maximum 100 characters)",
      });
    }

    // Validate phone
    if (
      phone !== undefined &&
      phone !== null &&
      (typeof phone !== "string" || phone.trim().length > 20)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Phone must be a string with a maximum of 20 characters",
      });
    }

    // Validate salary
    let employeeSalary = null;

    if (salary !== undefined && salary !== null && salary !== "") {
      employeeSalary = Number(salary);

      if (!Number.isFinite(employeeSalary) || employeeSalary < 0) {
        return res.status(400).json({
          status: "error",
          message: "Salary must be a valid non-negative number",
        });
      }
    }

    // Validate hire date (YYYY-MM-DD)
    if (
      typeof hire_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(hire_date) ||
      !Number.isFinite(Date.parse(`${hire_date}T00:00:00Z`)) ||
      new Date(`${hire_date}T00:00:00Z`).toISOString().slice(0, 10) !==
        hire_date
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid hire_date is required in YYYY-MM-DD format",
      });
    }

    // Check that the user exists
    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, role, is_active
       FROM users
       WHERE id = ?`,
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User account not found",
      });
    }

    // Do not create employee records for inactive accounts
    if (Number(users[0].is_active) !== 1) {
      return res.status(400).json({
        status: "error",
        message: "Cannot create an employee for an inactive user account",
      });
    }

    // Insert employee
    const [result] = await pool.execute(
      `INSERT INTO employees
       (user_id, phone, position, salary, hire_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        phone?.trim() || null,
        position.trim(),
        employeeSalary,
        hire_date,
      ],
    );

    return res.status(201).json({
      status: "success",
      message: "Employee created successfully",
      employee: {
        id: result.insertId,
        user_id: userId,
        first_name: users[0].first_name,
        last_name: users[0].last_name,
        email: users[0].email,
        role: users[0].role,
        phone: phone?.trim() || null,
        position: position.trim(),
        salary: employeeSalary,
        hire_date,
        employment_status: "active",
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "This user already has an employee record",
      });
    }

    next(error);
  }
};

// Admin gets all employee records
export const getEmployees = async (req, res, next) => {
  try {
    const [employees] = await pool.execute(
      `SELECT
        e.id,
        e.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active AS account_active,
        e.phone,
        e.position,
        e.salary,
        e.hire_date,
        e.employment_status,
        e.created_at,
        e.updated_at
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      ORDER BY e.id DESC`,
    );

    return res.status(200).json({
      status: "success",
      results: employees.length,
      employees,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.id);

    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid employee ID",
      });
    }

    const [employees] = await pool.execute(
      `SELECT
        e.id,
        e.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active AS account_active,
        e.phone,
        e.position,
        e.salary,
        e.hire_date,
        e.employment_status,
        e.created_at,
        e.updated_at
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      WHERE e.id = ?`,
      [employeeId],
    );

    if (employees.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      status: "success",
      employee: employees[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.id);
    const { phone, position, salary, hire_date } = req.body;

    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid employee ID",
      });
    }

    const allowedFields = ["phone", "position", "salary", "hire_date"];

    if (
      !allowedFields.some((field) =>
        Object.prototype.hasOwnProperty.call(req.body, field),
      )
    ) {
      return res.status(400).json({
        status: "error",
        message: "Provide at least one field to update",
      });
    }

    const [existing] = await pool.execute(
      `SELECT
    id,
    user_id,
    phone,
    position,
    salary,
    DATE_FORMAT(hire_date, '%Y-%m-%d') AS hire_date,
    employment_status
   FROM employees
   WHERE id = ?`,
      [employeeId],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const current = existing[0];

    const updatedPhone = phone === undefined ? current.phone : phone;

    const updatedPosition =
      position === undefined ? current.position : position;

    const updatedSalary = salary === undefined ? current.salary : salary;

    const updatedHireDate =
      hire_date === undefined ? current.hire_date : hire_date;

    if (
      updatedPhone !== null &&
      (typeof updatedPhone !== "string" || updatedPhone.trim().length > 20)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Phone must be a string with a maximum of 20 characters",
      });
    }

    if (
      typeof updatedPosition !== "string" ||
      !updatedPosition.trim() ||
      updatedPosition.trim().length > 100
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid position is required",
      });
    }

    const numericSalary =
      updatedSalary === null || updatedSalary === ""
        ? null
        : Number(updatedSalary);

    if (
      numericSalary !== null &&
      (!Number.isFinite(numericSalary) || numericSalary < 0)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Salary must be a valid non-negative number",
      });
    }

    const validDate =
      typeof updatedHireDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(updatedHireDate) &&
      Number.isFinite(Date.parse(`${updatedHireDate}T00:00:00Z`)) &&
      new Date(`${updatedHireDate}T00:00:00Z`).toISOString().slice(0, 10) ===
        updatedHireDate;

    if (!validDate) {
      return res.status(400).json({
        status: "error",
        message: "Valid hire_date is required in YYYY-MM-DD format",
      });
    }

    await pool.execute(
      `UPDATE employees
       SET phone = ?, position = ?, salary = ?, hire_date = ?
       WHERE id = ?`,
      [
        updatedPhone === null ? null : updatedPhone.trim(),
        updatedPosition.trim(),
        numericSalary,
        updatedHireDate,
        employeeId,
      ],
    );

    const [updated] = await pool.execute(
      `SELECT
        e.id, e.user_id,
        u.first_name, u.last_name, u.email, u.role,
        u.is_active AS account_active,
        e.phone, e.position, e.salary, e.hire_date,
        e.employment_status, e.created_at, e.updated_at
       FROM employees e
       INNER JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [employeeId],
    );

    return res.status(200).json({
      status: "success",
      message: "Employee updated successfully",
      employee: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeStatus = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.id);
    const { employment_status } = req.body;

    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid employee ID",
      });
    }

    const allowedStatuses = ["active", "on_leave", "terminated"];

    if (!allowedStatuses.includes(employment_status)) {
      return res.status(400).json({
        status: "error",
        message: "Employment status must be active, on_leave, or terminated",
      });
    }

    const [employees] = await pool.execute(
      "SELECT id FROM employees WHERE id = ?",
      [employeeId],
    );

    if (employees.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    await pool.execute(
      "UPDATE employees SET employment_status = ? WHERE id = ?",
      [employment_status, employeeId],
    );

    return res.status(200).json({
      status: "success",
      message: "Employee employment status updated successfully",
      employee: {
        id: employeeId,
        employment_status,
      },
    });
  } catch (error) {
    next(error);
  }
};
