import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Table } from 'primeng/table';
import { MessageService, ConfirmationService } from 'primeng/api';
import Swal from 'sweetalert2';
import * as Papa from 'papaparse';
import {DevisModel} from "../../../model/devis.model";
import {DevisService} from "../../../service/devis.service";
import {TechnicienModel} from "../../../model/technicien.model";
import {TechnicienService} from "../../../service/technicien.service";
import {AgenceModel} from "../../../model/agence.model";
import {AgenceService} from "../../../service/agence.service";


interface expandedRows {
    [key: string]: boolean;
}

@Component({
    templateUrl: './devis.component.html',
    providers: [MessageService, ConfirmationService]
})
export class DevisComponent implements OnInit {

    deviss: DevisModel[] = [];
    agences: AgenceModel[] = [];
    techniciens: TechnicienModel[] = [];
    loading: boolean = true;
    devis: DevisModel = {
        numero: "",
        date: null,
        equipementE: "",
        prestataire: "",
        montant: 0,
        assurance: null,
        rejected: null,
        notificationSent: null,
        handled: null,
        technicien: {  nom: "" },
        agence: {nom:""},
        traitepar: null,
    };
    submitted: boolean = false;
    devisDialog: boolean = false;
    isNew: boolean = true;

    constructor(private agenceService: AgenceService,
                private devisService: DevisService,
                private messageService: MessageService,
                private technicienService: TechnicienService
    ) { }

    ngOnInit(): void {
        this.getDeviss();
        this.getTechniciens();
        this.getAgences();
    }

    getDeviss(): void {
        this.devisService.getDevis().subscribe(
            (data: DevisModel[]) => {
                this.deviss = data;
                this.loading = false;
            },
            (error) => {
                console.error(error);
                this.loading = false;
            }
        );
    }
    getAgences(): void {
        this.agenceService.getAgences().subscribe(
            (data: AgenceModel[]) => {
                this.agences = data;
                this.loading = false;
            },
            (error) => {
                console.error(error);
                this.loading = false;
            }
        );
    }

    getTechniciens(): void {
        this.technicienService.getTechniciens().subscribe(
            (data: TechnicienModel[]) => {
                this.techniciens = data;
                this.loading = false;
            },
            (error) => {
                console.error(error);
                this.loading = false;
            }
        );
    }

    deleteDevis(id: number): void {
        this.devisService.deleteDevis(id).subscribe(
            () => {
                this.deviss = this.deviss.filter(devis => devis.id !== id);
                this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Devis Deleted', life: 3000 });
            },
            (error) => {
                console.error('Delete Devis Error:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete devis', life: 3000 });
            }
        );
    }


    @ViewChild('filter') filter!: ElementRef;
    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }
    clear(table: Table) {
        table.clear();
        this.filter.nativeElement.value = '';
    }

    openNew() {
        this.devis = {
            numero: "",
            equipementE: "",
            prestataire: "",
            montant: 0,
            assurance: null,
            rejected: null,
            technicien: {  nom: "" },
            agence: {nom:""},
        };
        this.submitted = true;
        this.devisDialog = true;
        this.isNew = true;
    }

    hideDialog() {
        this.devisDialog = false;
        this.submitted = false;
    }




    save() {
        this.submitted = true;

        if (this.devis.numero?.trim()) {
            this.devisService.getDevisByNumero(this.devis.numero).subscribe(
                (existingDeviss) => {
                    if (existingDeviss && this.isNew) {
                        Swal.fire({
                            icon: 'error',
                            title: `Devis ${this.devis.numero} Already Exists`,
                            text: `Tap "New" To Create New "Devis"`,
                        });
                    } else {

                        if (this.isNew) {
                            this.devisService.createDevis(this.devis).subscribe(
                                (newDevis) => {
                                    this.deviss.push(newDevis);
                                    Swal.fire({
                                        icon: 'success',
                                        title: `Devis Created Successfully`,
                                    });
                                    this.getDeviss();
                                },
                                (error) => {
                                    console.error(error);
                                    Swal.fire({
                                        icon: 'error',
                                        title: `Failed to create devis`,
                                    });
                                }
                            );
                        } else {
                            this.devisService.updateDevis(this.devis.id, this.devis).subscribe(
                                (updatedDevis) => {
                                    this.deviss = this.deviss.map(devis => devis.id === updatedDevis.id ? updatedDevis : devis);
                                    Swal.fire({
                                        icon: 'success',
                                        title: `Devis Updated Successfully`,
                                    });
                                    this.getDeviss();
                                },
                                (error) => {
                                    console.error(error);

                                    Swal.fire({
                                        icon: 'error',
                                        title: `Failed to update devis`,
                                    });
                                }
                            );
                        }
                    }

                    this.deviss = [...this.deviss];
                    this.devisDialog = false;
                    this.devis = {
                        numero: "",
                        equipementE: "",
                        prestataire: "",
                        montant: 0,
                        assurance: null,
                        rejected: null,
                        technicien: {  nom: "" },
                        agence: {nom:""},
                    };
                },
                (error) => {
                    console.error(error);
                    Swal.fire({
                        icon: 'error',
                        title: `Failed to check devis existence`,
                    });
                }
            );
        }
    }


    editDevis(devis: DevisModel) {
        this.devis = { ...devis };
        this.submitted = false;
        this.devisDialog = true;
        this.isNew = false;
    }

    exportDeviss() {
        const csv = Papa.unparse(this.deviss);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'deviss.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    importDeviss(event: any) {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                complete: (results) => {
                    results.data.forEach((data: any) => {
                        const newDevis: DevisModel = {
                            numero: "",
                            equipementE: "",
                            prestataire: "",
                            montant: 0,
                            assurance: null,
                            rejected: null,
                            technicien: {  nom: "" },
                            agence: {nom:""},
                        };
                        this.devisService.createDevis(newDevis).subscribe(
                            (newDevis) => {
                                this.deviss.push(newDevis);
                                this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Devis Imported', life: 3000 });
                            },
                            (error) => {
                                console.error(error);
                                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to import devis', life: 3000 });
                            }
                        );
                    });
                    this.getDeviss();
                }
            });
        }
    }


}
