import { Router } from 'express';
import { deactivateEmployee, getEmployeeById, listEmployees, updateEmployee } from '../controllers/employee.controller';
import { updateEmployeePassword } from '../controllers/employeePassword.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';
import { restrictTo } from '../middleware/role.middleware';

export const employeeRoutes = Router();

employeeRoutes.use(requireDb, adminAuthMiddleware, restrictTo('SUPER_ADMIN'));
employeeRoutes.get('/', listEmployees);
employeeRoutes.get('/:id', getEmployeeById);
employeeRoutes.put('/:id', updateEmployee);
employeeRoutes.put('/:id/password', updateEmployeePassword);
employeeRoutes.delete('/:id', deactivateEmployee);

