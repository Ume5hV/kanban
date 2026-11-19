using GunvorAssessment.Account;
using GunvorAssessment.Audit;
using GunvorAssessment.DateService;
using GunvorAssessment.LockDown;
using System;

namespace GunvorAssessment
{
    public enum AccountType
    {
        Current = 0,
        Saving = 1
    }

    /// <summary>
    /// This class creates instance of other class. The instance is guaranteed to stay the same for the duration of the test
    /// </summary>
    /// <remarks>
    /// You MUST modify this class as you see fit
    /// </remarks>
    public class GlobalFactory : IGlobalFactory
    {
        public IAccount GetAccount(AccountType type, int accountNumber)
        {
            return ConcreteAccountFactory.Instance.GetAccont(type, accountNumber);
        }

        public ITransactionAudit GetAudit()
        {
            return ConcreteTransactionAudit.Instance;
        }

        public ILockDownManager GetLockDownManager()
        {
            return ConcreteLockDownManager.Instance;
        }
        public IDateService GetDateService()
        {
            return new ConcreteDateService();
        }
    }

    public class ConcreteAccountFactory : IAccountFactory
    {
        private static readonly ConcreteAccountFactory _factory = new ConcreteAccountFactory();
        public static ConcreteAccountFactory Instance => _factory;
        IAccount _account;

        public IAccount GetAccont(AccountType type, int accountNumber)
        {
            if (type == AccountType.Current)
                _account = new ConcreteCurrentAccount(accountNumber);
            else
                _account = new ConcreteSavingAccount(accountNumber);
            return _account;
        }
    }

    //public class ConcreteTransactionFactroy : ITransactionFactroy
    //{
    //    private static readonly ConcreteTransactionFactroy _factory = new ConcreteTransactionFactroy();
    //    public static ConcreteTransactionFactroy Instance => _factory;

    //    public ITransactionAudit GetAudit()
    //    {
    //        return new ConcreteTransactionAudit();
    //    }
    //}

    public class ConcreteDateService : IDateService
    {
        public DateTimeOffset GetCurrentDateTime()
        {
            return DateTimeOffset.Now.DateTime;
        }
    }
}