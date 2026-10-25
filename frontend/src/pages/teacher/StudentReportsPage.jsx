import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Search, UserRound, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { downloadStudentReportPdf } from '../../services/api';

const StudentReportsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/reports/students');
        setStudents(response.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Unable to load students for reporting.');
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return students;
    return students.filter((student) =>
      [student.full_name, student.register_number, student.class_name, student.department_name]
        .some((value) => value?.toLowerCase().includes(search))
    );
  }, [students, query]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setReport(null);
    setError('');
    setLoadingReport(true);
    try {
      const response = await api.get(`/reports/student/${student.id}`);
      setReport(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Unable to generate this student report.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedStudent) return;
    setDownloading(true);
    setError('');
    try {
      await downloadStudentReportPdf(selectedStudent.id);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Unable to download the PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Student Attendance Reports</h1>
        <p className="text-sm text-slate-600 mt-1">
          Select a student to review attendance by subject and download an official PDF report.
        </p>
      </div>

      {user?.is_class_advisor && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center space-x-3 text-sm text-teal-900">
          <Award className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <div>
            <span className="font-bold">Class Advisor Reports:</span> You have full reporting access for students in{' '}
            <span className="font-semibold underline">{user?.advised_class_names?.join(', ') || 'your class'}</span>. You can review and download official PDF attendance reports.
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,360px)_1fr] gap-6 items-start">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <label htmlFor="student-search" className="text-sm font-bold text-slate-800">
              Find a student
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="student-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, register number, or class"
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {loadingStudents ? (
              <p className="p-5 text-sm text-slate-500">Loading students...</p>
            ) : filteredStudents.length ? (
              filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => selectStudent(student)}
                  className={`w-full text-left p-4 border-b border-slate-100 transition-colors hover:bg-teal-50 ${
                    selectedStudent?.id === student.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <span className="block font-semibold text-sm text-slate-900">{student.full_name}</span>
                  <span className="block text-xs text-slate-500 mt-1">
                    {student.register_number} · {student.class_name || 'Unassigned'}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-5 text-sm text-slate-500">
                {students.length ? 'No students match your search.' : 'No students are available in your reporting scope.'}
              </p>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 min-h-64">
          {!selectedStudent ? (
            <div className="min-h-52 flex flex-col items-center justify-center text-center text-slate-500">
              <UserRound className="w-9 h-9 mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">Choose a student</p>
              <p className="text-sm mt-1">Their attendance summary will appear here.</p>
            </div>
          ) : loadingReport ? (
            <p className="py-12 text-center text-sm text-slate-500">Generating attendance summary...</p>
          ) : report ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{report.student_name}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {report.register_number} · {report.class_name} · {report.department_name}
                  </p>
                  <p className="text-sm text-slate-600 mt-3">
                    Overall attendance: <strong className="text-teal-700">{report.overall_attendance_pct}%</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  <FileDown className="w-4 h-4" />
                  {downloading ? 'Preparing PDF...' : 'Download PDF'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-center">Held</th>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3 text-center">Absent</th>
                      <th className="px-4 py-3 text-center">Waived</th>
                      <th className="px-4 py-3 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.subjects.map((subject) => (
                      <tr key={subject.subject_id}>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{subject.subject_name}</span>
                          <span className="block text-xs text-slate-500">{subject.subject_code}</span>
                        </td>
                        <td className="px-4 py-3 text-center">{subject.total_classes}</td>
                        <td className="px-4 py-3 text-center">{subject.present_classes}</td>
                        <td className="px-4 py-3 text-center">{subject.absent_classes}</td>
                        <td className="px-4 py-3 text-center">{subject.waived_classes}</td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700">
                          {subject.effective_attendance_pct}%
                        </td>
                      </tr>
                    ))}
                    {!report.subjects.length && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                          No subject attendance data is available for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default StudentReportsPage;
