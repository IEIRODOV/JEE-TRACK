import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Calculator, Atom, Beaker, ScrollText, Globe, Landmark, Coins, Microscope, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, onAuthStateChanged, db, doc, onSnapshot, setDoc, User, handleFirestoreError, OperationType } from '@/src/firebase';

interface Chapter {
  id: string;
  name: string;
  completed: boolean;
}

interface Subject {
  name: string;
  color: string;
  font: string;
  chapters: Chapter[];
}

import { playTickSound, playCheckSound } from '@/src/lib/sounds';

const SubjectIcon = ({ name }: { name: string }) => {
  switch (name.toLowerCase()) {
    case 'mathematics':
    case 'maths': return <Calculator className="w-6 h-6" />;
    case 'physics': return <Atom className="w-6 h-6" />;
    case 'chemistry': return <Beaker className="w-6 h-6" />;
    case 'biology': return <Microscope className="w-6 h-6" />;
    case 'science': return <Atom className="w-6 h-6" />;
    case 'history': return <ScrollText className="w-6 h-6" />;
    case 'geography': return <Globe className="w-6 h-6" />;
    case 'civics': return <Landmark className="w-6 h-6" />;
    case 'economics': return <Coins className="w-6 h-6" />;
    case 'social science': return <Globe className="w-6 h-6" />;
    default: return <BookOpen className="w-6 h-6" />;
  }
};

interface SubjectChecklistProps {
  category: string;
  examId: string;
}

const SYLLABUS_DATA: Record<string, Record<string, string[]>> = {
  jee: {
    Maths: [
      "Sets, Relations & Functions", "Complex Numbers", "Matrices & Determinants",
      "Quadratic Equations", "Permutations & Combinations", "Binomial Theorem",
      "Sequences & Series", "Limit, Continuity & Differentiability", "Integral Calculus",
      "Differential Equations", "Coordinate Geometry", "Vector Algebra & 3D",
      "Probability", "Trigonometry", "Mathematical Reasoning", "Statistics",
      "Mathematical Induction", "Linear Inequalities"
    ],
    Physics: [
      "Physical World & Measurement", "Kinematics", "Laws of Motion", "Work, Energy & Power",
      "Rotational Motion", "Gravitation", "Properties of Solids & Liquids", "Thermodynamics",
      "Kinetic Theory of Gases", "Oscillations & Waves", "Electrostatics", "Current Electricity",
      "Magnetic Effects of Current & Magnetism", "Electromagnetic Induction & AC", "Electromagnetic Waves",
      "Optics", "Dual Nature of Matter & Radiation", "Atoms & Nuclei", "Electronic Devices",
      "Communication Systems", "Experimental Skills"
    ],
    Chemistry: [
      "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements",
      "Chemical Bonding", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions",
      "Hydrogen", "s-Block Elements", "p-Block Elements", "d & f Block Elements",
      "Coordination Compounds", "Environmental Chemistry", "Purification & Characterisation of Organic Compounds",
      "General Organic Chemistry", "Hydrocarbons", "Haloalkanes & Haloarenes", "Alcohols, Phenols & Ethers",
      "Aldehydes, Ketones & Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life",
      "Principles Related to Practical Chemistry"
    ]
  },
  neet: {
    Biology: [
      "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
      "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals",
      "Cell: The Unit of Life", "Biomolecules", "Cell Cycle & Cell Division", "Transport in Plants",
      "Mineral Nutrition", "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth & Development",
      "Digestion & Absorption", "Breathing & Exchange of Gases", "Body Fluids & Circulation",
      "Excretory Products & Their Elimination", "Locomotion & Movement", "Neural Control & Coordination",
      "Chemical Coordination & Integration", "Reproduction in Organisms", "Sexual Reproduction in Flowering Plants",
      "Human Reproduction", "Reproductive Health", "Principles of Inheritance & Variation",
      "Molecular Basis of Inheritance", "Evolution", "Human Health & Disease", "Strategies for Enhancement in Food Production",
      "Microbes in Human Welfare", "Biotechnology: Principles & Processes", "Biotechnology & Its Applications",
      "Organisms & Populations", "Ecosystem", "Biodiversity & Conservation", "Environmental Issues"
    ],
    Physics: [
      "Physical World & Measurement", "Kinematics", "Laws of Motion", "Work, Energy & Power",
      "Motion of System of Particles & Rigid Body", "Gravitation", "Properties of Bulk Matter",
      "Thermodynamics", "Behavior of Perfect Gas & Kinetic Theory", "Oscillations & Waves",
      "Electrostatics", "Current Electricity", "Magnetic Effects of Current & Magnetism",
      "Electromagnetic Induction & AC", "Electromagnetic Waves", "Optics", "Dual Nature of Matter & Radiation",
      "Atoms & Nuclei", "Electronic Devices"
    ],
    Chemistry: [
      "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements",
      "Chemical Bonding", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions",
      "Hydrogen", "s-Block Elements", "p-Block Elements", "d & f Block Elements",
      "Coordination Compounds", "Environmental Chemistry", "General Organic Chemistry",
      "Hydrocarbons", "Haloalkanes & Haloarenes", "Alcohols, Phenols & Ethers",
      "Aldehydes, Ketones & Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"
    ]
  },
  boards_9th: {
    Mathematics: [
      "Number Systems", "Polynomials", "Coordinate Geometry", "Linear Equations in Two Variables",
      "Introduction to Euclid’s Geometry", "Lines and Angles", "Triangles", "Quadrilaterals",
      "Circles", "Heron’s Formula", "Surface Areas and Volumes", "Statistics"
    ],
    Science: [
      "Matter in Our Surroundings", "Is Matter Around Us Pure", "Atoms and Molecules",
      "Structure of the Atom", "The Fundamental Unit of Life", "Tissues", "Motion",
      "Force and Laws of Motion", "Gravitation", "Work and Energy", "Sound",
      "Improvement in Food Resources"
    ],
    "Social Science": [
      "The French Revolution", "Socialism in Europe & Russian Revolution", "Nazism & Rise of Hitler",
      "Forest Society & Colonialism", "Pastoralists in Modern World",
      "India – Size & Location", "Physical Features of India", "Drainage", "Climate", 
      "Natural Vegetation & Wildlife", "Population",
      "What is Democracy? Why Democracy?", "Constitutional Design", "Electoral Politics", 
      "Working of Institutions", "Democratic Rights",
      "Story of Village Palampur", "People as Resource", "Poverty as a Challenge", "Food Security in India"
    ]
  },
  boards_10th: {
    Mathematics: [
      "Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables",
      "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry",
      "Introduction to Trigonometry", "Some Applications of Trigonometry", "Circles",
      "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"
    ],
    Science: [
      "Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals",
      "Carbon and its Compounds", "Life Processes", "Control and Coordination",
      "How do Organisms Reproduce?", "Heredity", "Light – Reflection and Refraction",
      "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current",
      "Our Environment"
    ],
    "Social Science": [
      "Rise of Nationalism in Europe", "Nationalism in India", "The Making of a Global World",
      "The Age of Industrialisation", "Print Culture & Modern World",
      "Resources & Development", "Forest & Wildlife Resources", "Water Resources", "Agriculture", 
      "Minerals & Energy Resources", "Manufacturing Industries", "Lifelines of National Economy",
      "Power Sharing", "Federalism", "Gender, Religion & Caste", "Political Parties", 
      "Outcomes of Democracy",
      "Development", "Sectors of Indian Economy", "Money & Credit", "Globalisation & Indian Economy", 
      "Consumer Rights"
    ]
  },
  boards_11th: {
    Mathematics: [
      "Sets", "Relations and Functions", "Trigonometric Functions", "Complex Numbers and Quadratic Equations",
      "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequences and Series",
      "Straight Lines", "Conic Sections", "Introduction to Three Dimensional Geometry",
      "Limits and Derivatives", "Statistics", "Probability"
    ],
    Physics: [
      "Units and Measurements", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion",
      "Work, Energy and Power", "System of Particles and Rotational Motion", "Gravitation",
      "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter",
      "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves"
    ],
    Chemistry: [
      "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity in Properties",
      "Chemical Bonding and Molecular Structure", "Chemical Thermodynamics", "Equilibrium",
      "Redox Reactions", "Organic Chemistry – Some Basic Principles and Techniques", "Hydrocarbons"
    ],
    Biology: [
      "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
      "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals",
      "Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division", "Photosynthesis in Higher Plants",
      "Respiration in Plants", "Plant Growth and Development", "Breathing and Exchange of Gases",
      "Body Fluids and Circulation", "Excretory Products and Their Elimination", "Locomotion and Movement",
      "Neural Control and Coordination", "Chemical Coordination and Integration"
    ]
  },
  boards_12th: {
    Mathematics: [
      "Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants",
      "Continuity and Differentiability", "Application of Derivatives", "Integrals",
      "Application of Integrals", "Differential Equations", "Vector Algebra",
      "Three Dimensional Geometry", "Linear Programming", "Probability"
    ],
    Physics: [
      "Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity",
      "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction",
      "Alternating Current", "Electromagnetic Waves", "Ray Optics and Optical Instruments", "Wave Optics",
      "Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics: Materials, Devices and Simple Circuits"
    ],
    Chemistry: [
      "Solutions", "Electrochemistry", "Chemical Kinetics", "The d-and f-Block Elements",
      "Coordination Compounds", "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers",
      "Aldehydes, Ketones and Carboxylic Acids", "Amines", "Biomolecules"
    ],
    Biology: [
      "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health",
      "Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution",
      "Human Health and Disease", "Microbes in Human Welfare", "Biotechnology: Principles and Processes",
      "Biotechnology and its Applications", "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation"
    ]
  }
};

const SubjectChecklist = ({ category, examId }: SubjectChecklistProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storageKey = `track-data-${category}-${examId}`;
    const firestorePath = `users/${user?.uid}/data/checklist-${category}-${examId}`;

    if (!user) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setSubjects(JSON.parse(saved));
        } catch (e) {
          setInitialData();
        }
      } else {
        setInitialData();
      }
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'data', `checklist-${category}-${examId}`), (doc) => {
      if (doc.exists()) {
        setSubjects(doc.data().subjects || []);
      } else {
        setInitialData();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, firestorePath, false);
    });

    return () => unsubscribe();
  }, [user, category, examId]);

  const setInitialData = () => {
    // Check for specific board syllabus first, then category, then default to jee
    // Normalize keys: boards_9 -> boards_9th, etc.
    const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
    const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[category] || SYLLABUS_DATA.jee;
    
    const colors = [
      "text-blue-400 border-blue-400/30 bg-blue-400/10",
      "text-rose-400 border-rose-400/30 bg-rose-400/10",
      "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
      "text-purple-400 border-purple-400/30 bg-purple-400/10",
      "text-amber-400 border-amber-400/30 bg-amber-400/10",
      "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
    ];

    const fonts = ["font-mono", "font-sans", "font-serif"];

    const initial: Subject[] = Object.entries(syllabus).map(([name, chapters], idx) => ({
      name,
      color: colors[idx % colors.length],
      font: fonts[idx % fonts.length],
      chapters: chapters.map(chName => ({ id: `${category}-${examId}-${name}-${chName}`, name: chName, completed: false }))
    }));
    setSubjects(initial);
  };

  const toggleChapter = async (subjectIndex: number, chapterIndex: number) => {
    const isCompleting = !subjects[subjectIndex].chapters[chapterIndex].completed;
    if (isCompleting) {
      playCheckSound();
    } else {
      playTickSound();
    }
    const newSubjects = [...subjects];
    newSubjects[subjectIndex].chapters[chapterIndex].completed = isCompleting;
    setSubjects(newSubjects);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', `checklist-${category}-${examId}`), { subjects: newSubjects });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/checklist-${category}-${examId}`);
      }
    } else {
      localStorage.setItem(`track-data-${category}-${examId}`, JSON.stringify(newSubjects));
    }
  };

  const totalChapters = subjects.reduce((acc, s) => acc + s.chapters.length, 0);
  const completedChapters = subjects.reduce((acc, s) => acc + s.chapters.filter(c => c.completed).length, 0);
  const totalProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest font-heading">Syllabus Tracker</h3>
        </div>
        <button 
          onClick={() => {
            if (window.confirm("Reset syllabus to default? All progress for this exam will be lost.")) {
              setInitialData();
            }
          }}
          className="text-[8px] font-black text-white/20 uppercase tracking-widest hover:text-rose-500 transition-colors"
        >
          Reset Progress
        </button>
      </div>

      {/* Total Progress Bar */}
      <div className="mb-12 p-8 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 text-center">
        <div className="flex flex-col items-center mb-6">
          <h3 className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black font-heading mb-2">Overall Mission Progress</h3>
          <div className="text-5xl font-black text-white tracking-tighter font-heading text-glow">
            {totalProgress}%
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
              {completedChapters} / {totalChapters} Chapters Mastered
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="h-full bg-gradient-to-r from-blue-500 via-rose-500 to-emerald-500 relative z-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-rose-500/20 to-emerald-500/20 blur-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {subjects.map((subject, sIdx) => (
        <div 
          key={subject.name} 
          className={`w-full rounded-2xl border backdrop-blur-md p-6 flex flex-col h-[550px] transition-all duration-300 hover:scale-[1.02] ${subject.color}`}
        >
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <SubjectIcon name={subject.name} />
            </div>
            <h2 className={`text-xl font-black uppercase tracking-[0.3em] ${subject.font}`}>
              {subject.name}
            </h2>
            <div className="h-1 w-12 bg-current opacity-20 rounded-full" />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-3">
              {subject.chapters.map((chapter, cIdx) => (
                <button
                  key={chapter.id}
                  onClick={() => toggleChapter(sIdx, cIdx)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-left
                    ${chapter.completed ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60'}`}
                >
                  {chapter.completed ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-current" />
                  ) : (
                    <Circle className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100" />
                  )}
                  <span className={`text-sm font-medium leading-tight ${chapter.completed ? 'line-through opacity-50' : ''}`}>
                    {chapter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] uppercase tracking-widest opacity-60 font-black">Progress</span>
              <span className="text-xl font-black">
                {Math.round((subject.chapters.filter(c => c.completed).length / subject.chapters.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(subject.chapters.filter(c => c.completed).length / subject.chapters.length) * 100}%` }}
                className="h-full bg-current rounded-full"
              />
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

export default SubjectChecklist;
