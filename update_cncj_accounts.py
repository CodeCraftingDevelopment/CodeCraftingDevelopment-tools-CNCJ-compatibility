#!/usr/bin/env python3
"""
Script pour mettre à jour la colonne isCNCJ dans Comptes_PCG_CNCJ.csv
en se basant sur les comptes présents dans Comptes_CNCJ.csv
"""

import csv
import os

def update_cncj_accounts():
    """Met à jour la colonne isCNCJ dans le fichier PCG_CNCJ"""
    
    # Chemins des fichiers
    base_path = os.path.dirname(os.path.abspath(__file__))
    pcg_cncj_file = os.path.join(base_path, "prod-data", "Comptes_PCG_CNCJ.csv")
    cncj_file = os.path.join(base_path, "prod-data", "Comptes_CNCJ.csv")
    
    print(f"Fichier PCG_CNCJ: {pcg_cncj_file}")
    print(f"Fichier CNCJ: {cncj_file}")
    
    # Vérifier que les fichiers existent
    if not os.path.exists(pcg_cncj_file):
        print(f"Erreur: Le fichier {pcg_cncj_file} n'existe pas")
        return
    
    if not os.path.exists(cncj_file):
        print(f"Erreur: Le fichier {cncj_file} n'existe pas")
        return
    
    # Lire les comptes CNCJ
    cncj_accounts = set()
    with open(cncj_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            account_number = row['N° de compte'].strip()
            if account_number:  # Ignorer les lignes vides
                cncj_accounts.add(account_number)
    
    print(f"Trouvé {len(cncj_accounts)} comptes CNCJ")
    print("Comptes CNCJ:", sorted(cncj_accounts)[:10], "..." if len(cncj_accounts) > 10 else "")
    
    # Lire le fichier PCG_CNCJ et mettre à jour
    updated_rows = []
    updated_count = 0
    
    with open(pcg_cncj_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        
        for row in reader:
            account_code = row['code'].strip()
            
            # Vérifier si ce compte est dans les comptes CNCJ
            if account_code in cncj_accounts:
                row['isCNCJ'] = 'true'
                updated_count += 1
            else:
                row['isCNCJ'] = 'false'
            
            updated_rows.append(row)
    
    print(f"Mis à jour {updated_count} comptes avec isCNCJ=true")
    
    # Écrire le fichier mis à jour
    with open(pcg_cncj_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
        writer.writeheader()
        writer.writerows(updated_rows)
    
    print(f"Fichier {pcg_cncj_file} mis à jour avec succès")

if __name__ == "__main__":
    update_cncj_accounts()
