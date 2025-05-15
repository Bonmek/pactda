import React, { useState, useEffect } from 'react';
import { PlusIcon, Search, Filter, Clock, FileText, CheckCircle, Edit3, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import AgreementCard from '@/components/AgreementCard';
import { AgreementData } from '@/types/agreement';
import { cn } from '@/lib/utils';
import { mockAgreements } from '@/mocks/agreements';

const stats = [
  { label: 'Total Agreements', value: '30', icon: FileText, trend: 'up', change: '12%' },
  { label: 'Active', value: '10', icon: CheckCircle, trend: 'up', change: '5%' },
  { label: 'Pending', value: '8', icon: Clock, trend: 'down', change: '2%' },
  { label: 'Completed', value: '7', icon: CheckCircle, trend: 'up', change: '3%' },
  { label: 'Cancelled', value: '3', icon: XCircle, trend: 'stable' },
  { label: 'Draft', value: '2', icon: Edit3, trend: 'stable' },
];

export default function Dashboard() {
  // Filters and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Agreements data
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    // In a real app, you would fetch this from an API
    setAgreements(mockAgreements);
  }, []);

  // Filtered agreements
  const filteredAgreements = agreements.filter((agreement) => {
    const matchesSearch = agreement.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter;
    const matchesType = typeFilter === 'all' || agreement.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination state and logic (must come after filteredAgreements)
  const [currentPage, setCurrentPage] = useState(1);
  const [prevPage, setPrevPage] = useState(1);
  const agreementsPerPage = 9;
  const totalPages = Math.ceil(filteredAgreements.length / agreementsPerPage);
  const paginatedAgreements = filteredAgreements.slice(
    (currentPage - 1) * agreementsPerPage,
    currentPage * agreementsPerPage
  );

  // Enhanced Pagination controls
  const Pagination = () => (
    <nav className="flex justify-center items-center gap-2 mt-8 select-none" aria-label="Pagination">
      <button
        className="px-3 py-1 rounded-full border border-gray-600 bg-primary-500 text-gray-300 hover:bg-blue-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => { setPrevPage(currentPage); setCurrentPage((p) => Math.max(1, p - 1)); }}
        disabled={currentPage === 1}
        aria-label="Previous Page"
      >
        &larr;
      </button>
      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
        <button
          key={page}
          className={`px-3 py-1 rounded-full border transition font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentPage === page
            ? 'bg-blue-500 text-white border-blue-500 shadow-md'
            : 'bg-primary-500 border-gray-600 text-gray-300 hover:bg-blue-600 hover:text-white'
            }`}
          onClick={() => { setPrevPage(currentPage); setCurrentPage(page); }}
          aria-current={currentPage === page ? 'page' : undefined}
        >
          {page}
        </button>
      ))}
      <button
        className="px-3 py-1 rounded-full border border-gray-600 bg-primary-500 text-gray-300 hover:bg-blue-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => { setPrevPage(currentPage); setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
        disabled={currentPage === totalPages}
        aria-label="Next Page"
      >
        &rarr;
      </button>
    </nav>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1f] via-[#0c1225] to-[#0a0f1f] text-white p-4 rounded-2xl md:p-6 flex flex-col items-center">
      <div className="w-full max-w-7xl p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            My Digital Agreements
          </h1>
          <p className="text-gray-400">Manage all your smart contract agreements in one place</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                type: 'spring',
                stiffness: 300,
                damping: 20
              }}
              className={cn(
                "relative overflow-hidden rounded-xl p-5 border transition-all duration-300 group",
                stat.trend === 'up' ? 'border-green-500/20 hover:border-green-500/40 bg-gradient-to-br from-green-500/5 to-transparent' :
                  stat.trend === 'down' ? 'border-red-500/20 hover:border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent' :
                    'border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-br from-blue-500/5 to-transparent'
              )}
            >
              {/* Background accent */}
              <div className={cn(
                "absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-xl",
                stat.trend === 'up' ? 'bg-green-500' :
                  stat.trend === 'down' ? 'bg-red-500' :
                    'bg-blue-500'
              )} />

              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
                      {stat.trend === 'up' && (
                        <span className="inline-flex items-center text-green-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      {stat.trend === 'down' && (
                        <span className="inline-flex items-center text-red-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 13.586 3.707 9.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 11.414 14.586 15H12z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      {stat.trend === 'stable' && (
                        <span className="inline-flex items-center text-blue-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold mt-1.5">
                      {stat.value}
                      {stat.change && (
                        <span className={cn(
                          "ml-2 text-xs font-normal",
                          stat.trend === 'up' ? 'text-green-400' :
                            stat.trend === 'down' ? 'text-red-400' :
                              'text-blue-400'
                        )}>
                          {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'} {stat.change}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className={cn(
                    "p-2.5 rounded-lg bg-opacity-30 backdrop-blur-sm",
                    stat.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                      stat.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                  )}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>

                {/* Progress bar */}
                {stat.trend !== 'stable' && (
                  <div className="mt-4 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        stat.trend === 'up' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          'bg-gradient-to-r from-red-400 to-red-600'
                      )}
                      style={{ width: `${stat.trend === 'up' ? '75%' : '40%'}` }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-[#0e1327]/50 backdrop-blur-sm border border-[#293256] rounded-xl p-4 mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-[#131a33] border-[#293256] text-gray-300 placeholder-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Filter className="h-4 w-4" />
                <span>Filter by:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 bg-[#131a33] border-[#293256] text-gray-300 hover:bg-[#1a2340] transition-colors">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-[#131a33] border-[#293256] backdrop-blur-lg">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Active
                  </SelectItem>
                  <SelectItem value="pending" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                    Pending
                  </SelectItem>
                  <SelectItem value="completed" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Completed
                  </SelectItem>
                  <SelectItem value="cancelled" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    Cancelled
                  </SelectItem>
                  <SelectItem value="draft" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                    Draft
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-44 bg-[#131a33] border-[#293256] text-gray-300 hover:bg-[#1a2340] transition-colors">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-[#131a33] border-[#293256] backdrop-blur-lg">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service agreement">Service Agreement</SelectItem>
                  <SelectItem value="art commission">Art Commission</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                onClick={() => console.log('Create new agreement')}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Create New</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <Card className="bg-[#131a33]/50 border-[#293256] animate-pulse h-80">
                    <CardContent className="p-6">
                      <div className="h-6 bg-[#1a2340] rounded w-3/4 mb-4"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-[#1a2340] rounded w-1/2"></div>
                        <div className="h-4 bg-[#1a2340] rounded w-2/3"></div>
                        <div className="h-4 bg-[#1a2340] rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : filteredAgreements.length > 0 ? (
            <div className="flex flex-col min-h-[520px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentPage}
                  className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(220px,1fr)] min-h-[460px]"
                  initial={{
                    opacity: 0,
                    x: currentPage > prevPage ? 80 : -80,
                    scale: 0.98
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                  }}
                  exit={{
                    opacity: 0,
                    x: currentPage > prevPage ? -80 : 80,
                    scale: 0.98,
                    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
                  }}
                  layout
                >
                  <AnimatePresence>
                    {paginatedAgreements.map((agreement, index) => (
                      <motion.div
                        key={agreement.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: {
                            opacity: { duration: 0.3 },
                            y: {
                              type: 'spring',
                              stiffness: 300,
                              damping: 20
                            }
                          }
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          transition: { duration: 0.2 }
                        }}
                        transition={{
                          layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
                        }}
                        className="h-full min-h-[220px]"
                      >
                        <AgreementCard agreement={agreement} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
              {totalPages > 1 && <Pagination />}
            </div>


          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.4,
                  ease: [0.4, 0, 0.2, 1]
                }
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                transition: { duration: 0.2 }
              }}
              className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center"
            >
              <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                <FileText className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">No agreements found</h3>
              <p className="text-gray-400 max-w-md mb-6">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating a new agreement'}
              </p>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New Agreement
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}