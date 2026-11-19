using GunvorAssessment.LockDown;
using System;

namespace GunvorAssessment
{
    public class ConcreteLockDownManager : ILockDownManager
    {
        private static readonly ConcreteLockDownManager _instance = new ConcreteLockDownManager();
        public static ConcreteLockDownManager Instance => _instance;
        public event EventHandler LockDownStarted;
        public event EventHandler LockDownEnded;

        public void EndLockDown()
        {
            LockDownEndedInvoker(EventArgs.Empty);
        }
        public void StartLockDown()
        {
            LockDownStartedInvoker(EventArgs.Empty);
        }
        protected virtual void LockDownStartedInvoker(EventArgs e)
        {
            LockDownStarted.Invoke(this, e);
        }
        protected virtual void LockDownEndedInvoker(EventArgs e)
        {
            LockDownEnded.Invoke(this, e);
        }
    } 
}