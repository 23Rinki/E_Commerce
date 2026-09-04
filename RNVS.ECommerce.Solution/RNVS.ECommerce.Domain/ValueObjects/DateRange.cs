namespace RNVS.ECommerce.Domain.ValueObjects;

public class DateRange
{
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }

    public DateRange(DateTime startDate, DateTime endDate)
    {
        StartDate = startDate;
        EndDate = endDate;
    }

    public bool IsActive => DateTime.UtcNow >= StartDate && DateTime.UtcNow <= EndDate;
}