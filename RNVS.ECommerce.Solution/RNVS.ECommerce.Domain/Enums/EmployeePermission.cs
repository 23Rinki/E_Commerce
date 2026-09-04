namespace RNVS.ECommerce.Domain.Enums;

[Flags]
public enum EmployeePermission
{
    None = 0,
    ViewProducts = 1,
    AddProducts = 2,
    EditProducts = 4,
    DeleteProducts = 8,
    ViewOrders = 16,
    ProcessOrders = 32,
    ViewCustomers = 64,
    ManageCustomers = 128,
    ViewReports = 256,
    ManageEmployees = 512,
    ViewPayouts = 1024,
    ManageSettings = 2048,
    All = ViewProducts | AddProducts | EditProducts | DeleteProducts | ViewOrders |
          ProcessOrders | ViewCustomers | ManageCustomers | ViewReports |
          ManageEmployees | ViewPayouts | ManageSettings
}
