import argon2 from 'argon2';

export const hashPassword = (pwd: string) => argon2.hash(pwd);
export const verifyPassword = (hash: string, pwd: string) => argon2.verify(hash, pwd);
