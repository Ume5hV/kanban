using GunvorAssessment.Account;
using GunvorAssessment.Audit;
using GunvorAssessment.DateService;
using GunvorAssessment.LockDown;

namespace GunvorAssessment
{
    public interface IAccountFactory
    {
        IAccount GetAccont(AccountType type, int accountNumber);
    }

    public interface ITransactionFactroy
    {
        ITransactionAudit GetAudit();
    }

}
