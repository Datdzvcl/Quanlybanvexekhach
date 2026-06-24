namespace BaseCore.Common.Auth;

public enum RoleEnum : byte  // byte = tinyint trong SQL
{
    Admin    = 2,
    Operator = 1,
    Customer = 0,
    Driver     = 3
}