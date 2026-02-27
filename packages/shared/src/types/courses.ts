// Course types — based on EXPO-01 supabase-contract.md

/** Course row */
export interface Course {
  id: string;
  code: string;
  title: string;
  is_active: boolean;
}

/** Tutor-course assignment row */
export interface TutorCourseAssignment {
  tutor_id: string;
  course_id: string;
}

/** Tutor-course assignment with joined course info */
export interface TutorCourseAssignmentWithCourse extends TutorCourseAssignment {
  courses: {
    code: string;
    title: string;
  };
}
