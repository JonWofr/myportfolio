import React, { Component, Fragment } from 'react';
import { cloneDeep } from 'lodash';

// Components
import Heading from '../../components/Heading';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import TableRow from '../../components/TableRow';
import ParagraphsWindow from '../../components/ParagraphsWindow';
import CustomHeader from '../../components/CustomHeader';

// Utils
import * as http from '../../utils/http';
import * as parser from '../../utils/parser';
import { getHttpToast } from '../../utils/toast';

// Models
import { projectsOverviewFormElementDefinitions as formElementDefinitions } from '../../models/formElementDefinitions';

// Styles
import styles from './ProjectsOverview.module.scss';

const initialNewProject = {
    projectName: "",
    categories: [],
    languages: [],
    technologies: [],
    teamMembers: [],
    startDate: "",
    endDate: "",
    gitRepoLink: "",
    paragraphs: [
        {
            heading: "",
            description: "",
            image: {
                position: "",
                url: ""
            }
        }
    ]
}

class ProjectsOverview extends Component {
    constructor(props) {
        super(props);

        this.state = {
            page: undefined,
            lastPage: undefined,
            limit: undefined,

            projects: [],
            editableProjectId: undefined,

            shouldShowParagraphs: false,
            currentlyVisibleParagraphsProjectId: undefined,

            toasts: [],

            newProject: {
                projectName: "",
                categories: [],
                languages: [],
                technologies: [],
                teamMembers: [],
                startDate: "",
                endDate: "",
                gitRepoLink: "",
                paragraphs: [
                    {
                        heading: "",
                        description: "",
                        image: {
                            position: "",
                            url: ""
                        }
                    }
                ]
            }
        }
    }

    componentDidMount = () => this.fetchProjects();

    render = () => {
        const { toasts, page, lastPage, shouldShowParagraphs } = this.state;
        return (
            <Fragment>
                <CustomHeader />
                <main>
                    <div id={styles.projectsOverview}>
                        {toasts.length > 0 &&
                            toasts.map((toast, index) => {
                                const { type, heading, description } = toast;
                                return (
                                    <Toast
                                        key={index}
                                        type={type}
                                        heading={heading}
                                        description={description}
                                        colorMode="dark"
                                    />
                                )
                            })
                        }
                        <div className={styles.headingContainer}>
                            <Heading type="primary" colorMode="dark">
                                Projects-formular
                            </Heading>
                        </div>
                        <table>
                            {this.renderTableBody()}
                            {this.renderTableFoot()}
                        </table>
                        {page && lastPage &&
                            <div id={styles.paginationContainer}>
                                <Pagination
                                    page={page}
                                    lastPage={lastPage}
                                    onClickPage={this.onClickPaginationPage}
                                    colorMode="dark"
                                />
                            </div>
                        }
                        {shouldShowParagraphs && this.renderParagraphs()}
                    </div>
                </main>
            </Fragment>
        )
    }

    fetchProjects = (page = 1, limit = 5) => {
        const queryObject = {
            page,
            limit
        }

        const queryString = parser.parseObjectToQueryString(queryObject)

        http.get(`${process.env.REACT_APP_BACKEND_URL}/projects${queryString}`)
            .then(({ status, statusText, response }) => {
                const { data, appendix: { lastPage } } = response;

                this.triggerHttpToast(status, statusText);

                const projects = parser.parseDocumentsToProjects(data);
                this.setState({
                    page,
                    limit,
                    lastPage,
                    projects
                });
            })
            .catch(({ status, statusText }) => {
                this.triggerHttpToast(status, statusText);
            })
    }

    triggerHttpToast = (status, statusText) => {
        const toast = getHttpToast(status, statusText);

        this.showHttpToast(toast);
        this.hideHttpToastAfter(5000, toast);
    }

    showHttpToast = (toast) => {
        const { toasts } = this.state;

        const deepClonedToasts = cloneDeep(toasts);
        deepClonedToasts.push(toast);

        this.setState({
            toasts: deepClonedToasts
        })
    }

    hideHttpToastAfter = (ms, toast) => setTimeout(() => {
        const { toasts } = this.state;

        let deepClonedToasts = cloneDeep(toasts);
        deepClonedToasts = deepClonedToasts.filter(deepClonedToast => deepClonedToast.timestamp !== toast.timestamp);

        this.setState({
            toasts: deepClonedToasts
        })
    }, ms);

    renderTableBody = () => {
        const { projects, editableProjectId } = this.state;
        const projectIds = Object.keys(projects);
        return (
            <tbody>
                {projectIds && projectIds.length > 0 &&
                    // Need to map over the keys, because projects is no array. It is an object with key - value pairs. But the keys are not known beforehand.
                    projectIds.map((projectId) => {
                        const project = projects[projectId];
                        return (
                            <TableRow
                                key={projectId}
                                tableRowId={projectId}
                                data={project}
                                formElementDefinitions={formElementDefinitions}
                                isEditable={projectId === editableProjectId ? true : false}
                                onChangeColumnValue={(propertyName, value) => this.onChangeProject(projectId, propertyName, value)}
                                onClickDelete={() => this.onClickDelete(projectId)}
                                onClickEdit={() => this.onClickEdit(projectId)}
                                onClickSave={() => this.onClickSave(projectId)}
                                onClickShowParagraphs={() => this.toggleShowParagraphs(projectId)}
                                colorMode="dark"
                            />
                        )
                    })
                }
            </tbody>
        )
    }

    onChangeProject = (projectId, propertyName, value) => {
        const { projects } = this.state;
        const deepClonedProjects = cloneDeep(projects);
        if (propertyName === "teamMembers") value = value.split(/\s*[,]\s+/);
        deepClonedProjects[projectId][propertyName] = value;
        this.setState({
            projects: deepClonedProjects
        });
    }

    onClickDelete = (projectId) => {
        const { projects, limit } = this.state;

        const body = {
            data: {},
            appendix: {
                limit
            }
        }

        http.remove(`${process.env.REACT_APP_BACKEND_URL}/projects/${projectId}`, body)
            .then(({ status, statusText, response }) => {
                const { appendix: { lastPage } } = response;

                this.triggerHttpToast(status, statusText);

                const deepClonedProjects = cloneDeep(projects);
                delete deepClonedProjects[projectId];
                this.setState({
                    projects: deepClonedProjects,
                    editableProjectId: undefined,
                    lastPage
                })
            })
            .catch(({ status, statusText }) => {
                this.triggerHttpToast(status, statusText);
            })
    }

    onClickEdit = (projectId) => {
        this.setState({
            editableProjectId: projectId !== this.state.editableProjectId ? projectId : undefined
        })
    }

    onClickSave = (projectId) => {
        const { projects, limit } = this.state;
        const body = {
            data: projects[projectId],
            appendix: {
                limit
            }
        }
        http.put(`${process.env.REACT_APP_BACKEND_URL}/projects/${projectId}`, body)
            .then(({ status, statusText }) => {
                this.triggerHttpToast(status, statusText);

                this.setState({
                    editableProjectId: undefined
                })
            })
            .catch(({ status, statusText }) => {
                this.triggerHttpToast(status, statusText);
            })
    }

    toggleShowParagraphs = (projectId) => this.setState({
        currentlyVisibleParagraphsProjectId: projectId ? projectId : undefined,
        shouldShowParagraphs: !this.state.shouldShowParagraphs
    });

    renderTableFoot = () => {
        const { newProject } = this.state;

        return (
            <tfoot>
                <TableRow
                    tableRowId="newResource"
                    data={newProject}
                    formElementDefinitions={formElementDefinitions}
                    isEditable={true}
                    onChangeColumnValue={(propertyName, value) => this.onChangeNewProject(propertyName, value)}
                    onClickSave={() => this.insertProject()}
                    onClickShowParagraphs={() => this.toggleShowParagraphs()}
                    onClickDelete={() => { }}
                    onClickEdit={() => { }}
                    colorMode="dark"
                />
            </tfoot>
        )
    }

    onChangeNewProject = (propertyName, value) => {
        const { newProject } = this.state;
        const deepClonedNewProject = cloneDeep(newProject);

        if (propertyName === "teamMembers") value = value.split(/\s*[,]\s+/)

        deepClonedNewProject[propertyName] = value;
        this.setState({
            newProject: deepClonedNewProject
        })
    }

    insertProject = () => {
        const { projects, newProject, limit } = this.state;
        const body = {
            data: newProject,
            appendix: {
                limit
            }
        }

        http.post(`${process.env.REACT_APP_BACKEND_URL}/projects`, body)
            .then(({ status, statusText, response }) => {
                const { data: { _id }, appendix: { lastPage } } = response;

                this.triggerHttpToast(status, statusText);

                const deepClonedProjects = cloneDeep(projects);
                deepClonedProjects[_id] = {
                    ...newProject,
                    _id
                }
                this.setState({
                    projects: deepClonedProjects,
                    newProject: initialNewProject,
                    lastPage
                })
            })
            .catch(({ status, statusText }) => {
                this.triggerHttpToast(status, statusText);
            })
    }

    renderParagraphs = () => {
        const { projects, newProject, editableProjectId, currentlyVisibleParagraphsProjectId } = this.state;
        return (
            <div id={styles.paragraphsWindowOverlay} onClick={() => this.toggleShowParagraphs()}>
                <div id={styles.paragraphsWindowContainer} onClick={(e) => e.stopPropagation()}>
                    <ParagraphsWindow
                        isEditable={currentlyVisibleParagraphsProjectId === editableProjectId ? true : false}
                        paragraphs={currentlyVisibleParagraphsProjectId ? projects[currentlyVisibleParagraphsProjectId].paragraphs : newProject.paragraphs}
                        onChangeValue={this.onChangeParagraphsWindowValue}
                        onClickAddNewParagraph={this.onClickParagraphsWindowAddNewParagraph}
                        onClickRemoveParagraph={this.onClickParagraphsWindowRemoveParagraph}
                        colorMode="dark"
                    />
                </div>
            </div>
        )
    }

    // TODO Changes are not displayed properly. State is not changed according to user input.

    onChangeParagraphsWindowValue = async (paragraphIndex, propertyName, value) => {
        const { currentlyVisibleParagraphsProjectId, projects, newProject } = this.state;

        if (propertyName === "file") {
            try {
                const { status, statusText, response: { url } } = await http.postFile(`${process.env.REACT_APP_BACKEND_URL}/images?filename=${value.name}`, value);
                this.triggerHttpToast(status, statusText);
                propertyName = "url";
                value = url;
            }
            catch ({ status, statusText }) {
                this.triggerHttpToast(status, statusText);
            }
        }

        let deepClonedProjects;
        let deepClonedProject;
        if (currentlyVisibleParagraphsProjectId) {
            deepClonedProjects = cloneDeep(projects);
            deepClonedProject = deepClonedProjects[currentlyVisibleParagraphsProjectId];
        }
        else deepClonedProject = cloneDeep(newProject);

        switch (propertyName) {
            case "heading":
            case "description":
                deepClonedProject.paragraphs[paragraphIndex][propertyName] = value;
                break;
            // Fall through feature --> continues with the code until break is reached
            case "position":
            case "url":
                deepClonedProject.paragraphs[paragraphIndex].image[propertyName] = value;
                break;
            default:
                throw new Error(`PropertyName ${propertyName} is not known`);
        }

        if (currentlyVisibleParagraphsProjectId) {
            deepClonedProjects[currentlyVisibleParagraphsProjectId] = deepClonedProject;
            this.setState({
                projects: deepClonedProjects
            });
        }
        else this.setState({
            newProject: deepClonedProject
        });
    }

    onClickParagraphsWindowAddNewParagraph = () => {
        const { currentlyVisibleParagraphsProjectId, projects, newProject } = this.state;

        let deepClonedProjects;
        let deepClonedProject;
        if (currentlyVisibleParagraphsProjectId) {
            deepClonedProjects = cloneDeep(projects);
            deepClonedProject = deepClonedProjects[currentlyVisibleParagraphsProjectId];
        }
        else deepClonedProject = cloneDeep(newProject);

        deepClonedProject.paragraphs.push(initialNewProject.paragraphs[0]);

        if (currentlyVisibleParagraphsProjectId) {
            deepClonedProjects[currentlyVisibleParagraphsProjectId] = deepClonedProject;
            this.setState({
                projects: deepClonedProjects
            });
        }
        else this.setState({
            newProject: deepClonedProject
        });

    }

    onClickParagraphsWindowRemoveParagraph = (paragraphIndex) => {
        const { currentlyVisibleParagraphsProjectId, projects, newProject } = this.state;

        let deepClonedProjects;
        let deepClonedProject;
        if (currentlyVisibleParagraphsProjectId) {
            deepClonedProjects = cloneDeep(projects);
            deepClonedProject = deepClonedProjects[currentlyVisibleParagraphsProjectId];
        }
        else deepClonedProject = cloneDeep(newProject);

        deepClonedProject.paragraphs.splice(paragraphIndex, 1);

        if (deepClonedProject.paragraphs.length === 0) {
            deepClonedProject.paragraphs.push(initialNewProject.paragraphs[0])
        }

        if (currentlyVisibleParagraphsProjectId) {
            deepClonedProjects[currentlyVisibleParagraphsProjectId] = deepClonedProject;
            this.setState({
                projects: deepClonedProjects
            });
        }
        else this.setState({
            newProject: deepClonedProject
        });
    }

    onClickPaginationPage = page => {
        const { limit } = this.state;
        this.fetchProjects(page, limit);
    }
}

export default ProjectsOverview;