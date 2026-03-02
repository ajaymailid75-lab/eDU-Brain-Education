import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Bell,
  LogOut,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  UserPlus,
  Mail,
  Phone,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Student {
  id: number;
  name: string;
  phone: string;
  email: string;
  course: string;
  total_fee: number;
  paid_amount: number;
  due_date: string;
  payment_status: 'Paid' | 'Pending';
  last_reminder_date: string | null;
}

interface Stats {
  totalStudents: number;
  pendingFees: number;
  collectedFees: number;
  overdueCount: number;
}

interface ReminderLog {
  id: number;
  student_name: string;
  reminder_date: string;
  reminder_type: string;
  status: string;
  message: string;
}

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: (token: string, role: string, username: string) => void }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      onLogin(data.token, data.role, data.username);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">eDU Brain Education</h1>
          <p className="text-slate-500 text-sm mt-1">Empowering Minds, Building Futures</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition-colors shadow-lg shadow-blue-100 mt-4"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Admin: admin / admin123</p>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = ({ token }: { token: string }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'reminders'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAll = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const [statsRes, studentsRes, remindersRes] = await Promise.all([
      fetch('/api/admin/stats', { headers }),
      fetch('/api/admin/students', { headers }),
      fetch('/api/admin/reminders', { headers })
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (studentsRes.ok) setStudents(await studentsRes.json());
    if (remindersRes.ok) setReminders(await remindersRes.json());
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...data,
        total_fee: Number(data.total_fee)
      }),
    });

    if (res.ok) {
      setIsAddModalOpen(false);
      fetchAll();
    }
  };

  const handleMarkPaid = async (id: number) => {
    const amount = prompt("Enter payment amount:");
    if (!amount) return;

    const res = await fetch(`/api/admin/students/${id}/pay`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount: Number(amount) }),
    });

    if (res.ok) fetchAll();
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">eDU Brain</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Education</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'students' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users size={20} />
            Students
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reminders' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Bell size={20} />
            Reminder Logs
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'students' && 'Student Management'}
              {activeTab === 'reminders' && 'Reminder Activity'}
            </h2>
            <p className="text-slate-500 text-sm">Welcome back, Administrator</p>
          </div>
          {activeTab === 'students' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
            >
              <UserPlus size={18} />
              Add Student
            </button>
          )}
        </header>

        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'blue' },
                { label: 'Pending Fees', value: `₹${stats.pendingFees}`, icon: Clock, color: 'amber' },
                { label: 'Collected Fees', value: `₹${stats.collectedFees}`, icon: CreditCard, color: 'emerald' },
                { label: 'Overdue Payments', value: stats.overdueCount, icon: AlertCircle, color: 'red' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${stat.color}-50 text-${stat.color}-600`}>
                    <stat.icon size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Reminder Logs</h3>
                <div className="space-y-4">
                  {reminders.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                        <Bell size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{log.student_name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{log.message}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{log.reminder_date}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase mt-1">
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {reminders.length === 0 && <p className="text-slate-400 text-center py-8">No recent activity</p>}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button onClick={() => setActiveTab('students')} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Users className="text-slate-400 group-hover:text-blue-600" size={20} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">View All Students</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                  </button>
                  <button onClick={() => setIsAddModalOpen(true)} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <UserPlus className="text-slate-400 group-hover:text-blue-600" size={20} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Add New Student</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                  </button>
                  <button onClick={() => setActiveTab('reminders')} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Bell className="text-slate-400 group-hover:text-blue-600" size={20} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Check Reminder Logs</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search students or courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-500">{s.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{s.course}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-slate-900 font-bold">₹{s.total_fee - s.paid_amount} <span className="text-slate-400 font-normal text-xs">due</span></p>
                          <p className="text-xs text-slate-400">Paid: ₹{s.paid_amount}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{s.due_date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${s.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {s.payment_status === 'Paid' ? <CheckCircle size={10} /> : <Clock size={10} />}
                          {s.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {s.payment_status !== 'Paid' && (
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-bold transition-colors"
                          >
                            Mark Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400">No students found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reminders.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4 text-sm text-slate-600">{log.reminder_date}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{log.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{log.message}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reminders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400">No reminder logs available.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Add New Student</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input name="name" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input name="phone" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91 9876543210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input name="email" type="email" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
                    <input name="course" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="JEE Advanced" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Fee (₹)</label>
                    <input name="total_fee" type="number" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="50000" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input name="due_date" type="date" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-100 mt-4">
                  Register Student
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudentDashboard = ({ token }: { token: string }) => {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      const res = await fetch('/api/student/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStudent(await res.json());
    };
    fetchMe();
  }, [token]);

  if (!student) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const dueAmount = student.total_fee - student.paid_amount;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">eDU Brain</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Student Portal</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-slate-500 hover:text-red-600 transition-all"
          >
            <LogOut size={20} />
          </button>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden"
        >
          <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium mb-1">Welcome back,</p>
              <h2 className="text-3xl font-bold">{student.name}</h2>
              <div className="flex gap-4 mt-4 text-sm text-blue-100">
                <span className="flex items-center gap-1"><BookOpen size={14} /> {student.course}</span>
                <span className="flex items-center gap-1"><Phone size={14} /> {student.phone}</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Course Fee</p>
                <h3 className="text-2xl font-bold text-slate-900">₹{student.total_fee}</h3>
              </div>
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-emerald-600/70 text-xs font-bold uppercase tracking-wider mb-1">Amount Paid</p>
                <h3 className="text-2xl font-bold text-emerald-700">₹{student.paid_amount}</h3>
              </div>
            </div>

            <div className={`p-8 rounded-3xl border-2 ${dueAmount > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'} text-center mb-8`}>
              <p className="text-slate-500 text-sm font-medium mb-2">Current Outstanding Balance</p>
              <h4 className={`text-5xl font-black ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ₹{dueAmount}
              </h4>
              {dueAmount > 0 && (
                <div className="mt-4 flex flex-col items-center">
                  <p className="text-amber-700 text-sm font-semibold flex items-center gap-2">
                    <Clock size={16} /> Due Date: {student.due_date}
                  </p>
                  <p className="text-slate-400 text-xs mt-2 italic">Reminders are sent every 2 days for pending dues.</p>
                </div>
              )}
              {dueAmount === 0 && (
                <p className="text-emerald-700 text-sm font-semibold flex items-center gap-2 mt-4">
                  <CheckCircle size={16} /> All fees cleared. Thank you!
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Support & Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <a href={`tel:${student.phone}`} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <Phone size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Call Office</span>
                </a>
                <a href={`mailto:support@edubrain.edu`} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <Mail size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Email Us</span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        <footer className="mt-12 text-center">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">eDU Brain Education</p>
          <p className="text-slate-300 text-[10px] mt-1">"Empowering Minds, Building Futures"</p>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState<{ token: string; role: string; username: string } | null>(null);

  const handleLogin = (token: string, role: string, username: string) => {
    setAuth({ token, role, username });
  };

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return auth.role === 'admin' ? (
    <AdminDashboard token={auth.token} />
  ) : (
    <StudentDashboard token={auth.token} />
  );
}
