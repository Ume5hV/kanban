using System.Threading.Tasks;
using GunvorAssessment.Account;
using GunvorAssessment.Audit;
using GunvorAssessment.Exceptions;

namespace GunvorAssessment
{
    internal class ConcreteSavingAccount : IAccount
    {
        public ConcreteSavingAccount(int accountNumber)
        {
            AccountNumber = accountNumber;
            OverdraftLimit = 0;
            audit = ConcreteTransactionAudit.Instance;
        }

        public int AccountNumber { get; private set; }

        public decimal OverdraftLimit { get; set; }

        public decimal Balance { get; private set; }

        ITransactionAudit audit { get; }

        public Task DepositAsync(decimal amount)
        {
            if (amount >= 0)
                return Task.Run(async () =>
                {
                    Balance += amount;
                    await audit.WriteTransactionAsync(new Transaction(TransactionType.Deposit, amount));
                });
            else
                throw new UnauthorizedAccountOperationException("negative amount is not allowed!");
        }

        public Task WithdrawAsync(decimal amount)
        {
            if (amount >= 0)
                return Task.Run(async () =>
                {
                    if (amount <= ((Balance * 10) / 100))
                    {
                        Balance -= amount;
                        await audit .WriteTransactionAsync(new Transaction(TransactionType.Deposit, amount));
                    }
                    else
                        throw new UnauthorizedAccountOperationException("amount is more than 10% of balance!");
                });
            else
                throw new UnauthorizedAccountOperationException("negative amount is not allowed!");
        }
    }
}