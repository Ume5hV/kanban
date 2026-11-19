using System;

namespace GunvorAssessment.Audit
{
    /// <summary>
    /// This class records a single transaction for a given account.
    /// </summary>
    /// <remarks>
    /// You CAN MODIFY this class as you see fit
    /// </remarks>
    public class Transaction
    {
        public int Id { get; set; }

        public TransactionType TransactionType { get; set; }

        public DateTimeOffset TransactionDate { get; set; }

        public decimal Amount { get; set; }

        public string Status { get; set; }

        public string Remarks { get; set; }

        public Transaction(TransactionType transactionType, decimal amount)
        {
            Id = 1;
            TransactionType = transactionType;
            TransactionDate = Container.Factory.GetDateService().GetCurrentDateTime();
            Amount = amount;
        }
    }
}