using GunvorAssessment.Account;
using System.Threading.Tasks;
using GunvorAssessment.Exceptions;
using GunvorAssessment.Audit;
using GunvorAssessment.LockDown;
using System;

namespace GunvorAssessment
{
    public class ConcreteCurrentAccount : IAccount
    {
        public ConcreteCurrentAccount(int accountNumber)
        {
            AccountNumber = accountNumber;
            Audit = ConcreteTransactionAudit.Instance;
            Lockdown = ConcreteLockDownManager.Instance;
        }
        public int AccountNumber { get; private set; }
        public decimal OverdraftLimit { get; set; }
        public decimal Balance { get; private set; }
        ITransactionAudit Audit { get; }
        ILockDownManager Lockdown { get; }

        public Task DepositAsync(decimal amount)
        {
            return Task.Run(async () =>
            {
                if (amount >= 0)
                {
                    Balance += amount;
                    Console.WriteLine($"Deposit task Id: {Task.CurrentId}");
                    await Audit.WriteTransactionAsync(new Transaction(TransactionType.Deposit, amount));
                }
                else
                    throw new UnauthorizedAccountOperationException("negative amount is not allowed!");
            });
        }

        public Task WithdrawAsync(decimal amount)
        {
            return Task.Run(async () =>
            {
                if (amount >= 0)
                    if (amount <= Balance)
                    {
                        Balance -= amount;
                        Console.WriteLine($"Withdraw task Id: {Task.CurrentId}");
                        await Audit.WriteTransactionAsync(new Transaction(TransactionType.Widthdraw, amount));
                    }
                    else if (amount > Balance && Balance - amount > OverdraftLimit)
                    {
                        Balance -= amount;
                        Console.WriteLine($"Withdraw task Id: {Task.CurrentId}");
                        await Audit.WriteTransactionAsync(new Transaction(TransactionType.Widthdraw, amount));
                    }
                    else
                        throw new UnauthorizedAccountOperationException("amount exceed than overdraft amount");
                else
                    throw new UnauthorizedAccountOperationException("negative amount is not allowed!");
            });
        }
    }
}