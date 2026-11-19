using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GunvorAssessment.Audit;

namespace GunvorAssessment
{
    public class ConcreteTransactionAudit : ITransactionAudit
    {
        private static readonly ConcreteTransactionAudit _instance = new ConcreteTransactionAudit();
        public static ConcreteTransactionAudit Instance => _instance;
        public ConcreteTransactionAudit()
        {
            transactions = new List<Transaction>();
        }

        private static List<Transaction> transactions;

        public Task<IEnumerable<Transaction>> GetAccountTransactionsAsync(int accountNumber)
        {
            return Task.Run(() => { return (IEnumerable<Transaction>)transactions; });
        }

        public Task WriteTransactionAsync(Transaction transaction)
        {
            Action action = () =>
                           {
                               Console.WriteLine($"Add transactio task Id: {Task.CurrentId}");
                               transaction.Id = transactions.Count + 1;
                               transactions.Add(transaction);
                           };
            return Task.Factory.StartNew(action);
        }
    }
}